def getPercentOfBranches(elements, gateway):
    possibleElements = {}
    none_elements = []
    for element in elements.values():
        if type(element).__name__ == "BPMNSequenceFlow" and element.superElement == gateway:
            if element.percentageOfBranches is None:
                possibleElements[element.subElement] = None
                none_elements.append(element.subElement)
            else:
                possibleElements[element.subElement] = element.percentageOfBranches / 100
    total_assigned_percent = sum([v for v in possibleElements.values() if v is not None])
    remaining_percent = 1 - total_assigned_percent
    if none_elements:
        equal_percent = remaining_percent / len(none_elements)
        for sub_element in none_elements:
            possibleElements[sub_element] = equal_percent
    return list(possibleElements.keys()), list(possibleElements.values())

def exclusiveGateway(elements, element, script):
    possibleElements, percents = getPercentOfBranches(elements, element.id_bpmn)
    functionStr = f"""
def {element.id_bpmn}(env, name):
    selectedElement = random.choices({possibleElements}, {percents})[0]
    with open(f'files/results_{{processName}}.txt', 'a') as f:
        f.write(f'''
{{name}}: [type={element.bpmn_type}, name={element.name}, id_bpmn={element.id_bpmn}, subTask="{{selectedElement}}", startTime={{env.now}}, instance={{name.split()[-1]}}]''')
    yield env.timeout(0)
    return selectedElement
"""
    extendedScript = script + functionStr
    for elem in possibleElements:
        if ('def ' + elem + '(env, name)') not in script:
            extendedScript = generateFunction(elements, elem, extendedScript)
    return extendedScript

def parallelGateway(elements, element, script):
    possibleElements = element.subTask
    functionStr = f"""
def {element.id_bpmn}(env, name):
    strSelectedElements = ", ".join({possibleElements})
    with open(f'files/results_{{processName}}.txt', 'a') as f:
        f.write(f'''
{{name}}: [type={element.bpmn_type}, name={element.name}, id_bpmn={element.id_bpmn}, subTask="{{strSelectedElements}}", startTime={{env.now}}, instance={{name.split()[-1]}}]''')
    yield env.timeout(0)
    return {possibleElements}
"""
    extendedScript = script + functionStr
    for elem in possibleElements:
        if ('def ' + elem + '(env, name)') not in script:
            extendedScript = generateFunction(elements, elem, extendedScript)
    return extendedScript

def inclusiveGateway(elements, element, script):
    possibleElements, percents = getPercentOfBranches(elements, element.id_bpmn)
    functionStr = f"""
def {element.id_bpmn}(env, name):
    elements = {possibleElements}
    percents = {percents}
    selectedElements = [element for element, percent in zip(elements, percents) if random.random() < percent]
    if not selectedElements:
        selectedElements = random.choices(elements, weights=percents, k=1)
    strSelectedElements = ", ".join(selectedElements)
    with open(f'files/results_{{processName}}.txt', 'a') as f:
        f.write(f'''
{{name}}: [type={element.bpmn_type}, name={element.name}, id_bpmn={element.id_bpmn}, subTask="{{strSelectedElements}}", startTime={{env.now}}, instance={{name.split()[-1]}}]''')
    yield env.timeout(0)
    return selectedElements
"""
    extendedScript = script + functionStr
    for elem in possibleElements:
        if ('def ' + elem + '(env, name)') not in script:
            extendedScript = generateFunction(elements, elem, extendedScript)
    return extendedScript

def eventBasedGateway(elements, element, script): 
    possibleElements = element.subTask
    functionStr = f"""
def {element.id_bpmn}(env, name):
    event_completions = []
    event_processes = []
    for elem in {possibleElements}:
        completion_event = env.event()
        event_proc = env.process(globals()[elem](env, name, completion_event))
        event_processes.append(event_proc)
        event_completions.append(completion_event)
    result = yield simpy.AnyOf(env, event_completions)
    for i, event in enumerate(event_completions):
        if event in result.events:
            next_task = event.value
            selected_event = {possibleElements}[i]
            with open(f'files/results_{{processName}}.txt', 'a') as f:
                f.write(f'''
{{name}}: [type={element.bpmn_type}, name={element.name}, id_bpmn={element.id_bpmn}, subTask="{{selected_event}}", startTime={{env.now}}, instance={{name.split()[-1]}}]''')
            for j, proc in enumerate(event_processes):
                if j != i:
                    proc.interrupt()
            break
    return next_task
"""
    extendedScript = script + functionStr
    for elem in possibleElements:
        if ('def ' + elem + '(env, name') not in script:
            extendedScript = generateFunction(elements, elem, extendedScript)
    return extendedScript

def generalTask(elements, element, script):
    functionStr = f"""
def {element.id_bpmn}(env, name):
    TaskName = '{element.id_bpmn}'
    if TaskName in requiredData.keys():
        dataObjects = requiredData[TaskName]
        start_standBy_data = env.now
        while not all((dataObject, name) in data for dataObject in dataObjects):
            yield env.timeout(1)
        if env.now > start_standBy_data:
            with open(f'files/results_{{processName}}.txt', 'a') as f:
                f.write(f'''
{{name}}: [type=StandByData, id_bpmn={{TaskName}}, startTime={{start_standBy_data}}, stopTime={{env.now}}, time={{env.now-start_standBy_data}}, instance={{name.split()[-1]}}]''')
    start_standBy = env.now
    if TaskName in security.keys():
            secTasks = security[TaskName]
            for secTask in secTasks.keys():
                if (secTask, name) in security_events:
                    while not security_events[(secTask, name)].triggered:
                        yield env.timeout(1)
                else:
                    start_event = env.event()
                    security_events[(secTask, name)] = start_event
    possibleUsers = {element.userTask}
    if possibleUsers is None:
        possibleUsers = userPool
    possibleUsers = resolve_possible_users_security(possibleUsers, TaskName, name)
    if isinstance(possibleUsers, dict):
        available_users = {{user:possibleUsers[user] for user in possibleUsers.keys() if user_resources[user].count < user_resources[user].capacity}}
        if sum(available_users.values()) < {element.numberOfExecutions}:
            possibleUsers = {element.userTask}
            if possibleUsers is None:
                possibleUsers = userPool
            possibleUsers = resolve_possible_users(possibleUsers, TaskName)
    else:
        available_users = [user for user in possibleUsers if user_resources[user].count < user_resources[user].capacity]
        if available_users == []:
            possibleUsers = {element.userTask}
            if possibleUsers is None:
                possibleUsers = userPool
            possibleUsers = resolve_possible_users(possibleUsers, TaskName)
    if isinstance(possibleUsers, dict):
        available_users = {{user:possibleUsers[user] for user in possibleUsers.keys() if user_resources[user].count < user_resources[user].capacity}}
        while sum(available_users.values()) < {element.numberOfExecutions}:
            yield env.timeout(1)
            available_users = {{user:possibleUsers[user] for user in possibleUsers.keys() if user_resources[user].count < user_resources[user].capacity}}
        userTask = {{}}
        n = 0
        for user, value in sorted(available_users.items(), key=lambda x: -x[1]):
            if n < {element.numberOfExecutions}:
                if n + value > {element.numberOfExecutions}:
                    userTask[user] = {element.numberOfExecutions} - n
                else:
                    userTask[user] = value
                n += value 
                user_assignments[user] += 1
            else:
                break
        if TaskName in security.keys():
            secTasks = security[TaskName]
            for secTask in secTasks.keys():
                infoSecTask = secTasks[secTask]
                if infoSecTask[0]:
                    task_users[(secTask, name, TaskName)].append(userTask.keys()[0])
                if infoSecTask[1]:
                    task_users[(secTask, name, TaskName)] = userTask.keys()[0]
                if infoSecTask[2]:
                    for user in userTask.keys():
                        if user in task_users[(secTask, name, TaskName)]:
                            task_users[(secTask, name, TaskName)][user] += userTask[user]
                        else:
                            task_users[(secTask, name, TaskName)][user] = userTask[user]
                if not security_events[(secTask, name)].triggered:
                    security_events[(secTask, name)].succeed()
        requests = {{}}
        for user in userTask.keys():
            requests[user] = user_resources[user].request()
        yield simpy.events.AllOf(env, requests.values())
        try:
            if env.now > start_standBy:
                with open(f'files/results_{{processName}}.txt', 'a') as f:
                    f.write(f'''
{{name}}: [type=StandBy, id_bpmn={{TaskName}}, startTime={{start_standBy}}, stopTime={{env.now}}, time={{env.now-start_standBy}}, instance={{name.split()[-1]}}]''')
            for user in userTask.keys():
                time = resolve_task_time('Activity_0qlrcb6', 20, 10, userTask[user], user)
                with open(f'files/results_{{processName}}.txt', 'a') as f:
                    f.write(f'''
{{name}}: [type={element.bpmn_type}, name={element.name}, id_bpmn={{TaskName}}, userTask={{user}}, numberOfExecutions={{userTask[user]}}, time={{time}}, subTask="{element.subTask}", startTime={{env.now}}, instance={{name.split()[-1]}}]''')
                yield env.timeout(time)
            if TaskName in generatedData.keys():
                dataObjects = generatedData[TaskName]
                for dataObject in dataObjects:
                    data.append((dataObject, name))
                    with open(f'files/results_{{processName}}.txt', 'a') as f:
                        f.write(f'''
{{name}}: [type=DataObject, id_bpmn={{dataObject}}, name={{dataInfo[dataObject]}}, generationTime={{env.now}}, instance={{name.split()[-1]}}]''')
        finally:
            for user in userTask.keys():
                user_resources[user].release(requests[user])
    else:
        available_users = [user for user in possibleUsers if user_resources[user].count < user_resources[user].capacity]
        while not available_users:
            yield env.timeout(1)
            available_users = [user for user in possibleUsers if user_resources[user].count < user_resources[user].capacity]
        if available_users:
            userTask = min(available_users, key=lambda u: user_assignments[u])
            user_assignments[userTask] += 1
            if TaskName in security.keys():
                secTasks = security[TaskName]
                for secTask in secTasks.keys():
                    infoSecTask = secTasks[secTask]
                    if infoSecTask[0]:
                        task_users[(secTask, name)].append(userTask)
                    if infoSecTask[1]:
                        task_users[(secTask, name)] = userTask
                    if infoSecTask[2]:
                        if userTask in task_users[(secTask, name, TaskName)]:
                            task_users[(secTask, name, TaskName)][userTask] += {element.numberOfExecutions}
                        else:
                            task_users[(secTask, name, TaskName)][userTask] = {element.numberOfExecutions}
                    if not security_events[(secTask, name)].triggered:
                        security_events[(secTask, name)].succeed()
            request = user_resources[userTask].request()
            yield request
            try:
                time = resolve_task_time('{element.id_bpmn}', {element.maximumTime}, {element.minimumTime}, {element.numberOfExecutions}, userTask)
                if env.now > start_standBy:
                    with open(f'files/results_{{processName}}.txt', 'a') as f:
                        f.write(f'''
{{name}}: [type=StandBy, id_bpmn={{TaskName}}, startTime={{start_standBy}}, stopTime={{env.now}}, time={{env.now-start_standBy}}, instance={{name.split()[-1]}}]''')
                with open(f'files/results_{{processName}}.txt', 'a') as f:
                    f.write(f'''
{{name}}: [type={element.bpmn_type}, name={element.name}, id_bpmn={{TaskName}}, userTask={{userTask}}, numberOfExecutions={element.numberOfExecutions}, time={{time}}, subTask="{element.subTask}", startTime={{env.now}}, instance={{name.split()[-1]}}]''')
                yield env.timeout(time)
                if TaskName in generatedData.keys():
                    dataObjects = generatedData[TaskName]
                    for dataObject in dataObjects:
                        data.append((dataObject, name))
                        with open(f'files/results_{{processName}}.txt', 'a') as f:
                            f.write(f'''
{{name}}: [type=DataObject, id_bpmn={{dataObject}}, name={{dataInfo[dataObject]}}, generationTime={{env.now}}, instance={{name.split()[-1]}}]''')
            finally:
                user_resources[userTask].release(request)
    for key, values in gatewayConnections.items():
        if TaskName in values:
            if (key, name) in gatewayOccurrences.keys():
                gatewayOccurrences[(key, name)] += 1
            else:
                gatewayOccurrences[(key, name)] = 1
    return '{element.subTask}'
"""
    return generateFunction(elements, element.subTask, script + functionStr)


def sendTask(elements, element, script):
    functionStr = f"""
def {element.id_bpmn}(env, name):
    TaskName = '{element.id_bpmn}'
    if TaskName in requiredData.keys():
        dataObjects = requiredData[TaskName]
        start_standBy_data = env.now
        while not all((dataObject, name) in data for dataObject in dataObjects):
            yield env.timeout(1)
        if env.now > start_standBy_data:
            with open(f'files/results_{{processName}}.txt', 'a') as f:
                f.write(f'''
{{name}}: [type=StandByData, id_bpmn={{TaskName}}, startTime={{start_standBy_data}}, stopTime={{env.now}}, time={{env.now-start_standBy_data}}, instance={{name.split()[-1]}}]''')
    start_standBy = env.now
    if TaskName in security.keys():
            secTasks = security[TaskName]
            for secTask in secTasks.keys():
                if (secTask, name) in security_events:
                    while not security_events[(secTask, name)].triggered:
                        yield env.timeout(1)
                else:
                    start_event = env.event()
                    security_events[(secTask, name)] = start_event
    possibleUsers = {element.userTask}
    if possibleUsers is None:
        possibleUsers = userPool
    possibleUsers = resolve_possible_users_security(possibleUsers, TaskNamee, name)
    if isinstance(possibleUsers, dict):
        available_users = {{user:possibleUsers[user] for user in possibleUsers.keys() if user_resources[user].count < user_resources[user].capacity}}
        if sum(available_users.values()) < {element.numberOfExecutions}:
            possibleUsers = resolve_possible_users(possibleUsers, TaskName)
    else:
        available_users = [user for user in possibleUsers if user_resources[user].count < user_resources[user].capacity]
        if available_users == []:
            possibleUsers = resolve_possible_users(possibleUsers, TaskName)
    if isinstance(possibleUsers, dict):
        available_users = {{user:possibleUsers[user] for user in possibleUsers.keys() if user_resources[user].count < user_resources[user].capacity}}
        while sum(available_users.values()) < {element.numberOfExecutions}:
            yield env.timeout(1)
            available_users = {{user:possibleUsers[user] for user in possibleUsers.keys() if user_resources[user].count < user_resources[user].capacity}}
        userTask = {{}}
        n = 0
        for user, value in sorted(available_users.items(), key=lambda x: -x[1]):
            if n < {element.numberOfExecutions}:
                if n + value > {element.numberOfExecutions}:
                    userTask[user] = {element.numberOfExecutions} - n
                else:
                    userTask[user] = value
                n += value 
                user_assignments[user] += 1
            else:
                break
        if TaskName in security.keys():
            secTasks = security[TaskName]
            for secTask in secTasks.keys():
                infoSecTask = secTasks[secTask]
                if infoSecTask[0]:
                    task_users[(secTask, name, TaskName)].append(userTask.keys()[0])
                if infoSecTask[1]:
                    task_users[(secTask, name, TaskName)] = userTask.keys()[0]
                if infoSecTask[2]:
                    for user in userTask.keys():
                        if user in task_users[(secTask, name, TaskName)]:
                            task_users[(secTask, name, TaskName)][user] += userTask[user]
                        else:
                            task_users[(secTask, name, TaskName)][user] = userTask[user]
                if not security_events[(secTask, name)].triggered:
                    security_events[(secTask, name)].succeed()
        requests = {{}}
        for user in userTask.keys():
            requests[user] = user_resources[user].request()
        yield simpy.events.AllOf(env, requests.values())
        try:
            if env.now > start_standBy:
                with open(f'files/results_{{processName}}.txt', 'a') as f:
                    f.write(f'''
{{name}}: [type=StandBy, id_bpmn={{TaskName}}, startTime={{start_standBy}}, stopTime={{env.now}}, time={{env.now-start_standBy}}, instance={{name.split()[-1]}}]''')
            for user in userTask.keys():
                time = resolve_task_time('Activity_0qlrcb6', 20, 10, userTask[user], user)
                with open(f'files/results_{{processName}}.txt', 'a') as f:
                    f.write(f'''
{{name}}: [type={element.bpmn_type}, name={element.name}, id_bpmn={{TaskName}}, userTask={{user}}, numberOfExecutions={{userTask[user]}}, time={{time}}, subTask="{element.subTask}", startTime={{env.now}}, instance={{name.split()[-1]}}]''')
                yield env.timeout(time)
            if TaskName in generatedData.keys():
                dataObjects = generatedData[TaskName]
                for dataObject in dataObjects:
                    data.append((dataObject, name))
                    with open(f'files/results_{{processName}}.txt', 'a') as f:
                        f.write(f'''
{{name}}: [type=DataObject, id_bpmn={{dataObject}}, name={{dataInfo[dataObject]}}, generationTime={{env.now}}, instance={{name.split()[-1]}}]''')
        finally:
            for user in userTask.keys():
                user_resources[user].release(requests[user])
    else:
        available_users = [user for user in possibleUsers if user_resources[user].count < user_resources[user].capacity]
        while not available_users:
            yield env.timeout(1)
            available_users = [user for user in possibleUsers if user_resources[user].count < user_resources[user].capacity]
        if available_users:
            userTask = min(available_users, key=lambda u: user_assignments[u])
            user_assignments[userTask] += 1
            if TaskName in security.keys():
                secTasks = security[TaskName]
                for secTask in secTasks.keys():
                    infoSecTask = secTasks[secTask]
                    if infoSecTask[0]:
                        task_users[(secTask, name)].append(userTask)
                    if infoSecTask[1]:
                        task_users[(secTask, name)] = userTask
                    if infoSecTask[2]:
                        if userTask in task_users[(secTask, name, TaskName)]:
                            task_users[(secTask, name, TaskName)][userTask] += {element.numberOfExecutions}
                        else:
                            task_users[(secTask, name, TaskName)][userTask] = {element.numberOfExecutions}
                    if not security_events[(secTask, name)].triggered:
                        security_events[(secTask, name)].succeed()
            request = user_resources[userTask].request()
            yield request
            try:
                time = resolve_task_time('{element.id_bpmn}', {element.maximumTime}, {element.minimumTime}, {element.numberOfExecutions}, userTask)
                if env.now > start_standBy:
                    with open(f'files/results_{{processName}}.txt', 'a') as f:
                        f.write(f'''
{{name}}: [type=StandBy, id_bpmn={{TaskName}}, startTime={{start_standBy}}, stopTime={{env.now}}, time={{env.now-start_standBy}}, instance={{name.split()[-1]}}]''')
                with open(f'files/results_{{processName}}.txt', 'a') as f:
                    f.write(f'''
{{name}}: [type={element.bpmn_type}, name={element.name}, id_bpmn={{TaskName}}, userTask={{userTask}}, numberOfExecutions={element.numberOfExecutions}, time={{time}}, subTask="{element.subTask}", startTime={{env.now}}, instance={{name.split()[-1]}}]''')
                yield env.timeout(time)
                if (TaskName, '{element.messageDestiny}', name) not in message_events:
                    message_events.append((TaskName, '{element.messageDestiny}', name))
                if TaskName in generatedData.keys():
                    dataObjects = generatedData[TaskName]
                    for dataObject in dataObjects:
                        data.append((dataObject, name))
                        with open(f'files/results_{{processName}}.txt', 'a') as f:
                            f.write(f'''
{{name}}: [type=DataObject, id_bpmn={{dataObject}}, name={{dataInfo[dataObject]}}, generationTime={{env.now}}, instance={{name.split()[-1]}}]''')
            finally:
                user_resources[userTask].release(request)
    for key, values in gatewayConnections.items():
        if TaskName in values:
            if (key, name) in gatewayOccurrences.keys():
                gatewayOccurrences[(key, name)] += 1
            else:
                gatewayOccurrences[(key, name)] = 1
    return '{element.subTask}'
"""
    return generateFunction(elements, element.subTask, script + functionStr)


def receiveTask(elements, element, script):
    functionStr = f"""
def {element.id_bpmn}(env, name):
    TaskName = '{element.id_bpmn}'
    start_standby_message = env.now
    while not ('{element.messageOrigin}', TaskName, name) in message_events:
        yield env.timeout(1)
    end_standby_message = env.now
    duration_standby_message = end_standby_message - start_standby_message
    if duration_standby_message > 0:
        with open(f'files/results_{{processName}}.txt', 'a') as f:
            f.write(f'''
{{name}}: [type=StandByMessage, id_bpmn={{TaskName}}, startTime={{start_standby_message}}, stopTime={{end_standby_message}}, time={{duration_standby_message}}, instance={{name.split()[-1]}}]''')
    if TaskName in requiredData.keys():
        dataObjects = requiredData[TaskName]
        start_standBy_data = env.now
        while not all((dataObject, name) in data for dataObject in dataObjects):
            yield env.timeout(1)
        if env.now > start_standBy_data:
            with open(f'files/results_{{processName}}.txt', 'a') as f:
                f.write(f'''
{{name}}: [type=StandByData, id_bpmn={{TaskName}}, startTime={{start_standBy_data}}, stopTime={{env.now}}, time={{env.now-start_standBy_data}}, instance={{name.split()[-1]}}]''')
    start_standBy = env.now
    if TaskName in security.keys():
            secTasks = security[TaskName]
            for secTask in secTasks.keys():
                if (secTask, name) in security_events:
                    while not security_events[(secTask, name)].triggered:
                        yield env.timeout(1)
                else:
                    start_event = env.event()
                    security_events[(secTask, name)] = start_event
    possibleUsers = {element.userTask}
    if possibleUsers is None:
        possibleUsers = userPool
    possibleUsers = resolve_possible_users_security(possibleUsers, TaskNamee, name)
    if isinstance(possibleUsers, dict):
        available_users = {{user:possibleUsers[user] for user in possibleUsers.keys() if user_resources[user].count < user_resources[user].capacity}}
        if sum(available_users.values()) < {element.numberOfExecutions}:
            possibleUsers = {element.userTask}
            if possibleUsers is None:
                possibleUsers = userPool
            possibleUsers = resolve_possible_users(possibleUsers, TaskName)
    else:
        available_users = [user for user in possibleUsers if user_resources[user].count < user_resources[user].capacity]
        if available_users == []:
            possibleUsers = {element.userTask}
            if possibleUsers is None:
                possibleUsers = userPool
            possibleUsers = resolve_possible_users(possibleUsers, TaskName)
    if isinstance(possibleUsers, dict):
        available_users = {{user:possibleUsers[user] for user in possibleUsers.keys() if user_resources[user].count < user_resources[user].capacity}}
        while sum(available_users.values()) < {element.numberOfExecutions}:
            yield env.timeout(1)
            available_users = {{user:possibleUsers[user] for user in possibleUsers.keys() if user_resources[user].count < user_resources[user].capacity}}
        userTask = {{}}
        n = 0
        for user, value in sorted(available_users.items(), key=lambda x: -x[1]):
            if n < {element.numberOfExecutions}:
                if n + value > {element.numberOfExecutions}:
                    userTask[user] = {element.numberOfExecutions} - n
                else:
                    userTask[user] = value
                n += value 
                user_assignments[user] += 1
            else:
                break
        if TaskName in security.keys():
            secTasks = security[TaskName]
            for secTask in secTasks.keys():
                infoSecTask = secTasks[secTask]
                if infoSecTask[0]:
                    task_users[(secTask, name, TaskName)].append(userTask.keys()[0])
                if infoSecTask[1]:
                    task_users[(secTask, name, TaskName)] = userTask.keys()[0]
                if infoSecTask[2]:
                    for user in userTask.keys():
                        if user in task_users[(secTask, name, TaskName)]:
                            task_users[(secTask, name, TaskName)][user] += userTask[user]
                        else:
                            task_users[(secTask, name, TaskName)][user] = userTask[user]
                if not security_events[(secTask, name)].triggered:
                    security_events[(secTask, name)].succeed()
        requests = {{}}
        for user in userTask.keys():
            requests[user] = user_resources[user].request()
        yield simpy.events.AllOf(env, requests.values())
        try:
            if env.now > start_standBy:
                with open(f'files/results_{{processName}}.txt', 'a') as f:
                    f.write(f'''
{{name}}: [type=StandBy, id_bpmn={{TaskName}}, startTime={{start_standBy}}, stopTime={{env.now}}, time={{env.now-start_standBy}}, instance={{name.split()[-1]}}]''')
            for user in userTask.keys():
                time = resolve_task_time('Activity_0qlrcb6', 20, 10, userTask[user], user)
                with open(f'files/results_{{processName}}.txt', 'a') as f:
                    f.write(f'''
{{name}}: [type={element.bpmn_type}, name={element.name}, id_bpmn={{TaskName}}, userTask={{user}}, numberOfExecutions={{userTask[user]}}, time={{time}}, subTask="{element.subTask}", startTime={{env.now}}, instance={{name.split()[-1]}}]''')
                yield env.timeout(time)
            if TaskName in generatedData.keys():
                dataObjects = generatedData[TaskName]
                for dataObject in dataObjects:
                    data.append((dataObject, name))
                    with open(f'files/results_{{processName}}.txt', 'a') as f:
                        f.write(f'''
{{name}}: [type=DataObject, id_bpmn={{dataObject}}, name={{dataInfo[dataObject]}}, generationTime={{env.now}}, instance={{name.split()[-1]}}]''')
        finally:
            for user in userTask.keys():
                user_resources[user].release(requests[user])
    else:
        available_users = [user for user in possibleUsers if user_resources[user].count < user_resources[user].capacity]
        while not available_users:
            yield env.timeout(1)
            available_users = [user for user in possibleUsers if user_resources[user].count < user_resources[user].capacity]
        if available_users:
            userTask = min(available_users, key=lambda u: user_assignments[u])
            user_assignments[userTask] += 1
            if TaskName in security.keys():
                secTasks = security[TaskName]
                for secTask in secTasks.keys():
                    infoSecTask = secTasks[secTask]
                    if infoSecTask[0]:
                        task_users[(secTask, name)].append(userTask)
                    if infoSecTask[1]:
                        task_users[(secTask, name)] = userTask
                    if infoSecTask[2]:
                        if userTask in task_users[(secTask, name, TaskName)]:
                            task_users[(secTask, name, TaskName)][userTask] += {element.numberOfExecutions}
                        else:
                            task_users[(secTask, name, TaskName)][userTask] = {element.numberOfExecutions}
                    if not security_events[(secTask, name)].triggered:
                        security_events[(secTask, name)].succeed()
            request = user_resources[userTask].request()
            yield request
            try:
                time = resolve_task_time('{element.id_bpmn}', {element.maximumTime}, {element.minimumTime}, {element.numberOfExecutions}, userTask)
                if env.now > start_standBy:
                    with open(f'files/results_{{processName}}.txt', 'a') as f:
                        f.write(f'''
{{name}}: [type=StandBy, id_bpmn={{TaskName}}, startTime={{start_standBy}}, stopTime={{env.now}}, time={{env.now-start_standBy}}, instance={{name.split()[-1]}}]''')
                with open(f'files/results_{{processName}}.txt', 'a') as f:
                    f.write(f'''
{{name}}: [type={element.bpmn_type}, name={element.name}, id_bpmn={{TaskName}}, userTask={{userTask}}, numberOfExecutions={element.numberOfExecutions}, time={{time}}, subTask="{element.subTask}", startTime={{env.now}}, instance={{name.split()[-1]}}]''')
                yield env.timeout(time)
                if TaskName in generatedData.keys():
                    dataObjects = generatedData[TaskName]
                    for dataObject in dataObjects:
                        data.append((dataObject, name))
                        with open(f'files/results_{{processName}}.txt', 'a') as f:
                            f.write(f'''
{{name}}: [type=DataObject, id_bpmn={{dataObject}}, name={{dataInfo[dataObject]}}, generationTime={{env.now}}, instance={{name.split()[-1]}}]''')
            finally:
                user_resources[userTask].release(request)
    for key, values in gatewayConnections.items():
        if TaskName in values:
            if (key, name) in gatewayOccurrences.keys():
                gatewayOccurrences[(key, name)] += 1
            else:
                gatewayOccurrences[(key, name)] = 1
    return '{element.subTask}'
"""
    return generateFunction(elements, element.subTask, script + functionStr)

def intermediateThrowEvent(elements, element, script):
    functionStr = f"""
def {element.id_bpmn}(env, name):
    with open(f'files/results_{{processName}}.txt', 'a') as f:
        f.write(f'''
{{name}}: [type={element.bpmn_type}, name={element.name}, id_bpmn={element.id_bpmn}, subTask="{element.subTask}", startTime={{env.now}}, instance={{name.split()[-1]}}]''')
    yield env.timeout(0)
    return '{element.subTask}'
    """
    return generateFunction(elements, element.subTask, script + functionStr)

def messageIntermediateCatchEvent(elements, element, script):
    functionStr = f"""
def {element.id_bpmn}(env, name):
    TaskName = '{element.id_bpmn}'
    start_standby_message = env.now
    while not ('{element.messageOrigin}', TaskName, name) in message_events:
        yield env.timeout(1)
    end_standby_message = env.now
    duration_standby_message = end_standby_message - start_standby_message
    if duration_standby_message > 0:
        with open(f'files/results_{{processName}}.txt', 'a') as f:
            f.write(f'''
{{name}}: [type=StandByMessage, id_bpmn={{TaskName}}, startTime={{start_standby_message}}, stopTime={{end_standby_message}}, time={{duration_standby_message}}, instance={{name.split()[-1]}}]''')
    with open(f'files/results_{{processName}}.txt', 'a') as f:
        f.write(f'''
{{name}}: [type={element.bpmn_type}, name={element.name}, id_bpmn={element.id_bpmn}, subTask="{element.subTask}", startTime={{env.now}}, instance={{name.split()[-1]}}]''')
    return '{element.subTask}'
"""
    return generateFunction(elements, element.subTask, script + functionStr)

def messageIntermediateThrowEvent(elements, element, script):
    functionStr = f"""
def {element.id_bpmn}(env, name):
    TaskName = '{element.id_bpmn}'
    with open(f'files/results_{{processName}}.txt', 'a') as f:
        f.write(f'''
{{name}}: [type={element.bpmn_type}, name={element.name}, id_bpmn={element.id_bpmn}, subTask="{element.subTask}", startTime={{env.now}}, instance={{name.split()[-1]}}]''')
    yield env.timeout(0)
    if (TaskName, '{element.messageDestiny}', name) not in message_events:
        message_events.append((TaskName, '{element.messageDestiny}', name))
    return '{element.subTask}'
"""
    return generateFunction(elements, element.subTask, script + functionStr)

def timerIntermediateCatchEvent(elements, element, script):
    functionStr = f"""
def {element.id_bpmn}(env, name):
    with open(f'files/results_{{processName}}.txt', 'a') as f:
        f.write(f'''
{{name}}: [type={element.bpmn_type}, name={element.name}, id_bpmn={element.id_bpmn}, time={element.time}, subTask="{element.subTask}", startTime={{env.now}}, instance={{name.split()[-1]}}]''')
    yield env.timeout({element.time})
    return '{element.subTask}'
"""
    return generateFunction(elements, element.subTask, script + functionStr)

def endEvent(elements, element, script):
    functionStr = f"""
def {element.id_bpmn}(env, name):
    with open(f'files/results_{{processName}}.txt', 'a') as f:
        f.write(f'''
{{name}}: [type={element.bpmn_type}, name={element.name}, id_bpmn={element.id_bpmn}, subTask="", startTime={{env.now}}, instance={{name.split()[-1]}}]''')
    yield env.timeout(0)
    """
    return script + functionStr

def generateFunction(elements, elementId, script=False):
    element = elements[elementId]
    elementType = type(element).__name__
    if elementType == "BPMNExclusiveGateway":
        return exclusiveGateway(elements, element, script)
    elif elementType == "BPMNParallelGateway":
        return parallelGateway(elements, element, script)
    elif elementType == "BPMNInclusiveGateway":
        return inclusiveGateway(elements, element, script)
    elif elementType == "BPMNEventBasedGateway":
        return eventBasedGateway(elements, element, script)
    elif elementType in ["BPMNTask", "BPMNUserTask", "", "BPMNManualTask", "BPMNBusinessRuleTask", "BPMNScriptTask", "BPMNCallActivity"]:
        return generalTask(elements, element, script)
    elif elementType == "BPMNSendTask":
        return sendTask(elements, element, script)
    elif elementType == "BPMNReceiveTask":
        return receiveTask(elements, element, script)
    elif elementType == "BPMNIntermediateThrowEvent":
        return intermediateThrowEvent(elements, element, script)
    elif elementType == "BPMNMessageIntermediateCatchEvent":
        return messageIntermediateCatchEvent(elements, element, script)
    elif elementType == "BPMNMessageIntermediateThrowEvent":
        return messageIntermediateThrowEvent(elements, element, script)
    elif elementType == "BPMNTimerIntermediateCatchEvent":
        return timerIntermediateCatchEvent(elements, element, script)
    elif elementType == "BPMNEndEvent":
        return endEvent(elements, element, script)

def serviceTask(elements):
    script = f"""
def checkServiceTasks(name):
    with open(f'files/results_{{processName}}.txt', 'r') as f:
        content = f.readlines()"""
    for element in elements.values():
        if not (isinstance(element, dict) or isinstance(element, list)) and element.bpmn_type == 'bpmn:ServiceTask':
            script += f"""
    found1 = False
    activities = {{"""
            subTasks = element.subTask
            for subElement in subTasks:
                script += f"""
        '{subElement}': False,"""
            script = script.rstrip(',')
            script += f"""
    }}
    last_activity_index = -1
    line_index = -1
    for line in content:
        line_index += 1
        if f'{{name}}:' in line and 'id_bpmn={element.id_bpmn}' in line:
            found1 = True
        for activity in activities:
            if f'{{name}}:' in line and f'id_bpmn={{activity}}' in line:
                activities[activity] = True
                last_activity_index = line_index
    number_found = sum(activities.values())
    if not found1 and number_found >= 1 and last_activity_index != -1:
        subtasks_str = ", ".join([activity for activity, found in activities.items() if found])
        new_line = f'''{{name}}: [type={element.bpmn_type}, name={element.name}, id_bpmn={element.id_bpmn}, sodSecurity={element.sodSecurity}, bodSecurity={element.bodSecurity}, uocSecurity={element.uocSecurity}, mth={element.mth}, subTask="{{subtasks_str}}"]\\n'''
        content.insert(last_activity_index + 1, new_line)
"""
    script += f"""
    with open(f'files/results_{{processName}}.txt', 'w') as f:
        f.writelines(content)
"""
    return script

def generateScript(elements, process, starts, messageStarts, security):
    elementProcess = elements[process]
    if elementProcess.bpmn_type == 'bpmn:Process':
        script = f"""
import simpy
import random

processName = '{process}'
nInstances = {elementProcess.instances}
frequency = {elementProcess.frequency}
rolePool = {elementProcess.userWithRole}
userWithRole = list(set(value for sublist in rolePool.values() for value in sublist))
userWithoutRole = {elementProcess.userWithoutRole}
userPool = userWithRole + userWithoutRole
user_task_count = {{}}
user_assignments = {{user: 0 for user in userPool}}
user_resources = {{}}
message_events = []
task_users = {{}}
security = {elements['security']}
security_events = {{}}
generatedData = {elements['generatedData']}
requiredData = {elements['requiredData']}
dataInfo = {elements['dataInfo']}
defaultData = {elements['defaultData']}
data = []
gatewayConnections = {elements['gatewayConnections']}
for i in range(nInstances):
    for dataObject in defaultData:
        data.append((dataObject, f'Instance {{i + 1}}'))

def resolve_task_time(task_name, max_time, min_time, executions, user):
    if user not in user_task_count:
        user_task_count[user] = {{}}
    if task_name not in user_task_count[user]:
        user_task_count[user][task_name] = 0

    mu = (min_time+max_time)/2
    sigma = (max_time-min_time)/6
    time = sum(max(min_time, min(random.gauss(mu,sigma), max_time)) for _ in range(executions))
    reduction_factor = 1 - min(0.05 * user_task_count[user][task_name], 0.5)

    user_task_count[user][task_name] += 1
    return round(time * reduction_factor)

def resolve_possible_users(possibleUsers, taskName):
    users = []
    for item in possibleUsers:
        if item in rolePool:
            users.extend(rolePool[item])
        elif item in userWithoutRole:
            users.append(item)
        elif item in userWithRole:
            users.append(item)
    return list(set(users))

def resolve_possible_users_security(possibleUsers, taskName, instance):
    users = []
    for item in possibleUsers:
        if item in rolePool:
            users.extend(rolePool[item])
        elif item in userWithoutRole:
            users.append(item)
        elif item in userWithRole:
            users.append(item)
    users = list(set(users))
    if taskName in security:
        secTasks = security[taskName]
        for secTask in secTasks.keys():
            infoTask = secTasks[secTask]
            if infoTask[0]:
                if (secTask, instance) in task_users.keys():
                    if isinstance(users, dict):
                        for user in task_users[(secTask, instance)]:
                            users.pop(user) if user in users.keys() else None
                    else:
                        for user in task_users[(secTask, instance)]:
                            users.remove(user) if user in users else None
                else:
                    task_users[(secTask, instance)] = []
            elif infoTask[1]:
                if (secTask, instance) in task_users.keys():
                    if isinstance(users, dict):
                        n = users[task_users[(secTask, instance)]]
                        users.clear()
                        users[task_users[(secTask, instance)]] = n
                    else:
                        users = [task_users[(secTask, instance)]]
            elif infoTask[2]:
                if (secTask, instance, taskName) in task_users.keys():
                    if isinstance(users, dict):
                        for user in task_users[(secTask, instance, taskName)].keys():
                            if task_users[(secTask, instance, taskName)][user] >= infoTask[3]:
                                users.pop(user) if user in users.keys() else None
                            else:
                                if user in users.keys():
                                    executionsDone = task_users[(secTask, instance, taskName)][user]
                                    maxExecutions = infoTask[3] - executionsDone
                                    if users[user] < maxExecutions:
                                        users[user] = maxExecutions
                    else:
                        usersUoC = {{}}
                        for user in task_users[(secTask, instance, taskName)].keys():
                            if task_users[(secTask, instance, taskName)][user] < infoTask[3]:
                                usersUoC[user] = infoTask[3] - task_users[(secTask, instance, taskName)][user]
                        users = usersUoC
                else:
                    task_users[(secTask, instance, taskName)] = {{}}
                    usersUoC = {{}}
                    for user in users:
                        usersUoC[user] = infoTask[3]
                    users = usersUoC
    return users
"""
        startElements = {}
        messageStartElements = {}
        for start in starts:
            startEvent = elements[start]
            startElements[start] = [startEvent.bpmn_type, startEvent.name, startEvent.id_bpmn, startEvent.subTask]
            script = generateFunction(elements, startEvent.subTask, script)
        for start in messageStarts:
            startEvent = elements[start]
            messageStartElements[start] = [startEvent.bpmn_type, startEvent.name, startEvent.id_bpmn, startEvent.messageOrigin, startEvent.subTask]
            script = generateFunction(elements, startEvent.subTask, script)
        if security:
            scriptServiceTask = serviceTask(elements)
        else:
            scriptServiceTask = ''
        scriptMainFunction = f"""
def process_task(env, name, task_name):
    task_func = globals()[task_name]
    result = yield env.process(task_func(env, name))
    if result:
        if isinstance(result, list):
            for next_task in result:
                if next_task in gatewayConnections.keys():
                    if (next_task, name) in gatewayOccurrences.keys() and gatewayOccurrences[(next_task, name)] == len(gatewayConnections[next_task]):
                        if (next_task, name) not in gatewayProcessed:
                            gatewayProcessed.add((next_task, name))
                            env.process(process_task(env, name, next_task))
                else:
                    env.process(process_task(env, name, next_task))
        else:
            if result in gatewayConnections.keys():
                if (result, name) in gatewayOccurrences.keys() and gatewayOccurrences[(result, name)] == len(gatewayConnections[result]):
                    if (result, name) not in gatewayProcessed:
                        gatewayProcessed.add((result, name))
                        env.process(process_task(env, name, result))
            else:
                env.process(process_task(env, name, result))


def start_process(env, name, nextTask):
    yield env.process(process_task(env, name, nextTask))

def main(env):
    global user_resources
    user_resources = {{user: simpy.Resource(env, capacity=1) for user in userPool}}
    with open(f'files/results_{{processName}}.txt', 'w') as f:
        f.write(f"Element: [type={elementProcess.bpmn_type}, name={elementProcess.name}, id_bpmn={elementProcess.id_bpmn}, instances={{nInstances}}, frequency={{frequency}}, userWithoutRole={{userWithoutRole}}, userWithRole={{rolePool}}]")
    startEvents = {startElements}
    messageStartEvents = {messageStartElements}
    for i in range(nInstances):
        for start in {starts}:
            with open(f'files/results_{{processName}}.txt', 'a') as f:
                f.write(f'''
Instance {{i + 1}}: [type={{startEvents[start][0]}}, name={{startEvents[start][1]}}, id_bpmn={{startEvents[start][2]}}, subTask="{{startEvents[start][3]}}", startTime={{env.now}}, instance={{i+1}}]''')
            env.process(start_process(env, f'Instance {{i + 1}}', startEvents[start][3]))
        for start in {messageStarts}:
            start_standby_message = env.now
            while (messageStartEvents[start][3], start, f'Instance {{i + 1}}') not in message_events:
                yield env.timeout(1)
            end_standby_message = env.now
            duration_standby_message = end_standby_message - start_standby_message
            if duration_standby_message > 0:
                with open(f'files/results_{{processName}}.txt', 'a') as f:
                    f.write(f'''
Instance {{i + 1}}: [type=StandByMessage, id_bpmn={{start}}, startTime={{start_standby_message}}, stopTime={{end_standby_message}}, time={{duration_standby_message}}, instance={{i+1}}]''')
            with open(f'files/results_{{processName}}.txt', 'a') as f:
                f.write(f'''
Instance {{i + 1}}: [type={{messageStartEvents[start][0]}}, name={{messageStartEvents[start][1]}}, id_bpmn={{messageStartEvents[start][2]}}, messageOrigin={{messageStartEvents[start][3]}}, subTask="{{messageStartEvents[start][4]}}", startTime={{env.now}}, instance={{i+1}}]''')
            env.process(start_process(env, f'Instance {{i + 1}}', messageStartEvents[start][4]))
        yield env.timeout(frequency)

env = simpy.Environment()
env.process(main(env))
env.run()"""
    else:
        script = f"""
import simpy
import random

processName = '{process}'
nInstances = {elementProcess.instances}
usersPerLane = {elements['users']}
userPool = []
for u in usersPerLane.values():
    userPool.extend(u)
userPool = list(set(userPool))
elementsContainer = {elements['elementsContainer']}
user_task_count = {{}}
user_assignments = {{user: 0 for user in userPool}}
user_resources = {{}}
message_events = []
task_users = {{}}
security = {elements['security']}
security_events = {{}}
generatedData = {elements['generatedData']}
requiredData = {elements['requiredData']}
dataInfo = {elements['dataInfo']}
defaultData = {elements['defaultData']}
gatewayConnections = {elements['gatewayConnections']}
gatewayOccurrences = {{}}
gatewayProcessed = set()
data = []
for i in range(nInstances):
    for dataObject in defaultData:
        data.append((dataObject, f'Instance {{i + 1}}'))

def resolve_task_time(task_name, max_time, min_time, executions, user):
    if user not in user_task_count:
        user_task_count[user] = {{}}
    if task_name not in user_task_count[user]:
        user_task_count[user][task_name] = 0

    mu = (min_time+max_time)/2
    sigma = (max_time-min_time)/6
    time = sum(max(min_time, min(random.gauss(mu,sigma), max_time)) for _ in range(executions))
    reduction_factor = 1 - min(0.05 * user_task_count[user][task_name], 0.5)

    user_task_count[user][task_name] += 1
    return round(time * reduction_factor)

def resolve_possible_users(possibleUsers, taskName):
    laneUsers = usersPerLane[elementsContainer[taskName]]
    users = []
    for item in possibleUsers:
        if item in laneUsers:
            users.append(item)
    return list(set(users))

def resolve_possible_users_security(possibleUsers, taskName, instance):
    laneUsers = usersPerLane[elementsContainer[taskName]]
    users = []
    for item in possibleUsers:
        if item in laneUsers:
            users.append(item)
    users = list(set(users))
    if taskName in security:
        secTasks = security[taskName]
        for secTask in secTasks.keys():
            infoTask = secTasks[secTask]
            if infoTask[0]:
                if (secTask, instance) in task_users.keys():
                    if isinstance(users, dict):
                        for user in task_users[(secTask, instance)]:
                            users.pop(user) if user in users.keys() else None
                    else:
                        for user in task_users[(secTask, instance)]:
                            users.remove(user) if user in users else None
                else:
                    task_users[(secTask, instance)] = []
            elif infoTask[1]:
                if (secTask, instance) in task_users.keys():
                    if isinstance(users, dict):
                        n = users[task_users[(secTask, instance)]]
                        users.clear()
                        users[task_users[(secTask, instance)]] = n
                    else:
                        users = [task_users[(secTask, instance)]]
            elif infoTask[2]:
                if (secTask, instance, taskName) in task_users.keys():
                    if isinstance(users, dict):
                        for user in task_users[(secTask, instance, taskName)].keys():
                            if task_users[(secTask, instance, taskName)][user] >= infoTask[3]:
                                users.pop(user) if user in users.keys() else None
                            else:
                                if user in users.keys():
                                    executionsDone = task_users[(secTask, instance, taskName)][user]
                                    maxExecutions = infoTask[3] - executionsDone
                                    if users[user] < maxExecutions:
                                        users[user] = maxExecutions
                    else:
                        usersUoC = {{}}
                        for user in task_users[(secTask, instance, taskName)].keys():
                            if task_users[(secTask, instance, taskName)][user] < infoTask[3]:
                                usersUoC[user] = infoTask[3] - task_users[(secTask, instance, taskName)][user]
                        users = usersUoC
                else:
                    task_users[(secTask, instance, taskName)] = {{}}
                    usersUoC = {{}}
                    for user in users:
                        usersUoC[user] = infoTask[3]
                    users = usersUoC
    return users
"""
        startElements = {}
        messageStartElements = {}
        for start in starts:
            startEvent = elements[start]
            startElements[start] = [startEvent.bpmn_type, startEvent.name, startEvent.id_bpmn, startEvent.subTask]
            script = generateFunction(elements, startEvent.subTask, script)
        for start in messageStarts:
            startEvent = elements[start]
            messageStartElements[start] = [startEvent.bpmn_type, startEvent.name, startEvent.id_bpmn, startEvent.messageOrigin, startEvent.subTask]
            script = generateFunction(elements, startEvent.subTask, script)
        if security:
            scriptServiceTask = serviceTask(elements)
        else:
            scriptServiceTask = ''
        scriptMainFunction = f"""
def process_task(env, name, task_name):
    task_func = globals()[task_name]
    result = yield env.process(task_func(env, name))
    if result:
        if isinstance(result, list):
            for next_task in result:
                if next_task in gatewayConnections.keys():
                    if (next_task, name) in gatewayOccurrences.keys() and gatewayOccurrences[(next_task, name)] == len(gatewayConnections[next_task]):
                        if (next_task, name) not in gatewayProcessed:
                            gatewayProcessed.add((next_task, name))
                            env.process(process_task(env, name, next_task))
                else:
                    env.process(process_task(env, name, next_task))
        else:
            if result in gatewayConnections.keys():
                if (result, name) in gatewayOccurrences.keys() and gatewayOccurrences[(result, name)] == len(gatewayConnections[result]):
                    if (result, name) not in gatewayProcessed:
                        gatewayProcessed.add((result, name))
                        env.process(process_task(env, name, result))
            else:
                env.process(process_task(env, name, result))


def start_process(env, name, nextTask):
    yield env.process(process_task(env, name, nextTask))

def participant_process(env, frequency, p):
    startEvents = {startElements}
    messageStartEvents = {messageStartElements}
    startsParticipant = {elements['startsParticipant']}
    for i in range(nInstances):
        for start in {starts}:
            if startsParticipant[start] == p:
                with open(f'files/results_{{processName}}.txt', 'a') as f:
                    f.write(f'''
Instance {{i + 1}}: [type={{startEvents[start][0]}}, name={{startEvents[start][1]}}, id_bpmn={{startEvents[start][2]}}, subTask="{{startEvents[start][3]}}", startTime={{env.now}}, instance={{i+1}}]''')
                env.process(start_process(env, f'Instance {{i + 1}}', startEvents[start][3]))
        for start in {messageStarts}:
            if startsParticipant[start] == p:
                start_standby_message = env.now
                while (messageStartEvents[start][3], start, f'Instance {{i + 1}}') not in message_events:
                    yield env.timeout(1)
                end_standby_message = env.now
                duration_standby_message = end_standby_message - start_standby_message
                if duration_standby_message > 0:
                    with open(f'files/results_{{processName}}.txt', 'a') as f:
                        f.write(f'''
Instance {{i + 1}}: [type=StandByMessage, id_bpmn={{start}}, startTime={{start_standby_message}}, stopTime={{end_standby_message}}, time={{duration_standby_message}}, instance={{i+1}}]''')
                with open(f'files/results_{{processName}}.txt', 'a') as f:
                    f.write(f'''
Instance {{i + 1}}: [type={{messageStartEvents[start][0]}}, name={{messageStartEvents[start][1]}}, id_bpmn={{messageStartEvents[start][2]}}, messageOrigin={{messageStartEvents[start][3]}}, subTask="{{messageStartEvents[start][4]}}", startTime={{env.now}}, instance={{i+1}}]''')
                env.process(start_process(env, f'Instance {{i + 1}}', messageStartEvents[start][4]))
        yield env.timeout(frequency)

def main(env):
    global user_resources
    user_resources = {{user: simpy.Resource(env, capacity=1) for user in userPool}}
    with open(f'files/results_{{processName}}.txt', 'w') as f:
        f.write(f"Element: [type={elementProcess.bpmn_type}, name={elementProcess.name}, id_bpmn={elementProcess.id_bpmn}, instances={{nInstances}}]")
    for frequency, p in {elements['participants']}:
        env.process(participant_process(env, frequency, p))
        yield env.timeout(0)

env = simpy.Environment()
env.process(main(env))
env.run()"""
    if security:
        scriptMainFunction += f"""
for i in range(nInstances):
    checkServiceTasks(f'Instance {{i + 1}}')"""
    return script + scriptServiceTask + scriptMainFunction, process
