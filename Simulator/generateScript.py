from models.parser import parse_bpmn_elements

def getPercentOfBranches(elements, gateway):
    possibleElements = []
    percents = []
    for element in elements.values():
        if type(element).__name__ == "BPMNSequenceFlow" and element.superElement == gateway:
            possibleElements.append(element.subElement)
            percents.append(element.percentageOfBranches / 100)
    return possibleElements, percents

def exclusiveGateway(elements, element, script):
    possibleElements, percents = getPercentOfBranches(elements, element.id_bpmn)
    functionStr = f"""
def {element.id_bpmn}(env, name):
    selectedElement = random.choices({possibleElements}, {percents})[0]
    with open('files/results_{next(iter(elements))}.txt', 'a') as f:
        f.write(f'''
{{name}}: [type={element.bpmn_type}, name={element.name}, id_bpmn={element.id_bpmn}, subTask="{{selectedElement}}", startTime={{env.now}}]''')
    yield env.timeout(0)
    return selectedElement
    """
    extendedScript = script + functionStr
    for elem in possibleElements:
        if elem not in script:
            extendedScript = generateFunction(elements, elem, extendedScript)
    return extendedScript

def task(elements, element, script):
    functionStr = f"""
def {element.id_bpmn}(env, name):
    TaskName = '{element.id_bpmn}'
    possibleUsers = {element.userTask}
    if possibleUsers is None:
        possibleUsers = userPool
    users_direct, users_roles = resolve_possible_users(possibleUsers)
    available_users_direct = [user for user in users_direct if user_resources[user].count < user_resources[user].capacity]
    if available_users_direct:
        userTask = random.choice(available_users_direct)
        with user_resources[userTask].request() as req:
            yield req
            min_time = {element.minimumTime}
            max_time = {element.maximumTime}
            mu = (min_time+max_time)/2
            sigma = (max_time-min_time)/6
            time = sum(int(max(min_time, min(random.gauss(mu,sigma), max_time))) for _ in range({element.numberOfExecutions}))
            with open('files/results_{next(iter(elements))}.txt', 'a') as f:
                f.write(f'''
{{name}}: [type={element.bpmn_type}, name={element.name}, id_bpmn={{TaskName}}, userTask={{userTask}}, numberOfExecutions={element.numberOfExecutions}, time={{time}}, subTask="{element.subTask}", startTime={{env.now}}]''')
            yield env.timeout(time)
            user_resources[userTask].release(req)
    else:
        available_users_roles = [user for user in users_roles if user_resources[user].count < user_resources[user].capacity]
        if available_users_roles:
            userTask = random.choice(available_users_roles)
            with user_resources[userTask].request() as req:
                yield req
                min_time = {element.minimumTime}
                max_time = {element.maximumTime}
                mu = (min_time+max_time)/2
                sigma = (max_time-min_time)/6
                time = sum(int(max(min_time, min(random.gauss(mu,sigma), max_time))) for _ in range({element.numberOfExecutions}))
                with open('files/results_{next(iter(elements))}.txt', 'a') as f:
                    f.write(f'''
{{name}}: [type={element.bpmn_type}, name={element.name}, id_bpmn={{TaskName}}, userTask={{userTask}}, numberOfExecutions={element.numberOfExecutions}, time={{time}}, subTask="{element.subTask}", startTime={{env.now}}]''')
                yield env.timeout(time)
                user_resources[userTask].release(req)
        else:
            time_standby_start = env.now
            requests_direct = {{user: user_resources[user].request() for user in users_direct}}
            requests_roles = {{user: user_resources[user].request() for user in users_roles}}
            all_requests = list(requests_direct.values()) + list(requests_roles.values())
            result = yield simpy.AnyOf(env, all_requests)
            userTask = None
            for user, req in requests_direct.items():
                if req in result.events:
                    userTask = user
                    break
            if userTask is None:
                for user, req in requests_roles.items():
                    if req in result.events:
                        userTask = user
                        break
            for user, req in {{**requests_direct, **requests_roles}}.items():
                if req not in result.events:
                    req.cancel()

            standby_end_time = env.now
            standby_duration = standby_end_time - time_standby_start
            with open('files/results_Process_1.txt', 'a') as f:
                f.write(f'''
{{name}}: StandBy on task {{TaskName}}, start at {{time_standby_start}}, stops at {{standby_end_time}}, duration of {{standby_duration}}''')
            min_time = {element.minimumTime}
            max_time = {element.maximumTime}
            mu = (min_time+max_time)/2
            sigma = (max_time-min_time)/6
            time = sum(int(max(min_time, min(random.gauss(mu,sigma), max_time))) for _ in range({element.numberOfExecutions}))
            with open('files/results_Process_1.txt', 'a') as f:
                f.write(f'''
{{name}}: [type={element.bpmn_type}, name={element.name}, id_bpmn={{TaskName}}, userTask={{userTask}}, numberOfExecutions={element.numberOfExecutions}, time={{time}}, subTask="{element.subTask}", startTime={{env.now}}]''')
            yield env.timeout(time)
            user_resources[userTask].release(req)
    return '{element.subTask}'
"""
    return generateFunction(elements, element.subTask, script + functionStr)

def manualTask(elements, element, script):
    functionStr = f"""
def {element.id_bpmn}(env, name):
    TaskName = '{element.id_bpmn}'
    possibleUsers = {element.userTask}
    if possibleUsers is None:
        possibleUsers = userPool
    users_direct, users_roles = resolve_possible_users(possibleUsers)
    available_users_direct = [user for user in users_direct if user_resources[user].count < user_resources[user].capacity]
    if available_users_direct:
        userTask = random.choice(available_users_direct)
        with user_resources[userTask].request() as req:
            yield req
            min_time = {element.minimumTime}
            max_time = {element.maximumTime}
            mu = (min_time+max_time)/2
            sigma = (max_time-min_time)/6
            time = sum(int(max(min_time, min(random.gauss(mu,sigma), max_time))) for _ in range({element.numberOfExecutions}))
            with open('files/results_{next(iter(elements))}.txt', 'a') as f:
                f.write(f'''
{{name}}: [type={element.bpmn_type}, name={element.name}, id_bpmn={{TaskName}}, userTask={{userTask}}, numberOfExecutions={element.numberOfExecutions}, time={{time}}, subTask="{element.subTask}", startTime={{env.now}}]''')
            yield env.timeout(time)
            user_resources[userTask].release(req)
    else:
        available_users_roles = [user for user in users_roles if user_resources[user].count < user_resources[user].capacity]
        if available_users_roles:
            userTask = random.choice(available_users_roles)
            with user_resources[userTask].request() as req:
                yield req
                min_time = {element.minimumTime}
                max_time = {element.maximumTime}
                mu = (min_time+max_time)/2
                sigma = (max_time-min_time)/6
                time = sum(int(max(min_time, min(random.gauss(mu,sigma), max_time))) for _ in range({element.numberOfExecutions}))
                with open('files/results_{next(iter(elements))}.txt', 'a') as f:
                    f.write(f'''
{{name}}: [type={element.bpmn_type}, name={element.name}, id_bpmn={{TaskName}}, userTask={{userTask}}, numberOfExecutions={element.numberOfExecutions}, time={{time}}, subTask="{element.subTask}", startTime={{env.now}}]''')
                yield env.timeout(time)
                user_resources[userTask].release(req)
        else:
            time_standby_start = env.now
            requests_direct = {{user: user_resources[user].request() for user in users_direct}}
            requests_roles = {{user: user_resources[user].request() for user in users_roles}}
            all_requests = list(requests_direct.values()) + list(requests_roles.values())
            result = yield simpy.AnyOf(env, all_requests)
            userTask = None
            for user, req in requests_direct.items():
                if req in result.events:
                    userTask = user
                    break
            if userTask is None:
                for user, req in requests_roles.items():
                    if req in result.events:
                        userTask = user
                        break
            for user, req in {{**requests_direct, **requests_roles}}.items():
                if req not in result.events:
                    req.cancel()

            standby_end_time = env.now
            standby_duration = standby_end_time - time_standby_start
            with open('files/results_Process_1.txt', 'a') as f:
                f.write(f'''
{{name}}: StandBy on task {{TaskName}}, start at {{time_standby_start}}, stops at {{standby_end_time}}, duration of {{standby_duration}}''')
            min_time = {element.minimumTime}
            max_time = {element.maximumTime}
            mu = (min_time+max_time)/2
            sigma = (max_time-min_time)/6
            time = sum(int(max(min_time, min(random.gauss(mu,sigma), max_time))) for _ in range({element.numberOfExecutions}))
            with open('files/results_Process_1.txt', 'a') as f:
                f.write(f'''
{{name}}: [type={element.bpmn_type}, name={element.name}, id_bpmn={{TaskName}}, userTask={{userTask}}, numberOfExecutions={element.numberOfExecutions}, time={{time}}, subTask="{element.subTask}", startTime={{env.now}}]''')
            yield env.timeout(time)
            user_resources[userTask].release(req)
    return '{element.subTask}'
"""
    return generateFunction(elements, element.subTask, script + functionStr)

def userTask(elements, element, script):
    functionStr = f"""
def {element.id_bpmn}(env, name):
    TaskName = '{element.id_bpmn}'
    possibleUsers = {element.userTask}
    if possibleUsers is None:
        possibleUsers = userPool
    users_direct, users_roles = resolve_possible_users(possibleUsers)
    available_users_direct = [user for user in users_direct if user_resources[user].count < user_resources[user].capacity]
    if available_users_direct:
        userTask = random.choice(available_users_direct)
        with user_resources[userTask].request() as req:
            yield req
            min_time = {element.minimumTime}
            max_time = {element.maximumTime}
            mu = (min_time+max_time)/2
            sigma = (max_time-min_time)/6
            time = sum(int(max(min_time, min(random.gauss(mu,sigma), max_time))) for _ in range({element.numberOfExecutions}))
            with open('files/results_{next(iter(elements))}.txt', 'a') as f:
                f.write(f'''
{{name}}: [type={element.bpmn_type}, name={element.name}, id_bpmn={{TaskName}}, userTask={{userTask}}, numberOfExecutions={element.numberOfExecutions}, time={{time}}, subTask="{element.subTask}", startTime={{env.now}}]''')
            yield env.timeout(time)
            user_resources[userTask].release(req)
    else:
        available_users_roles = [user for user in users_roles if user_resources[user].count < user_resources[user].capacity]
        if available_users_roles:
            userTask = random.choice(available_users_roles)
            with user_resources[userTask].request() as req:
                yield req
                min_time = {element.minimumTime}
                max_time = {element.maximumTime}
                mu = (min_time+max_time)/2
                sigma = (max_time-min_time)/6
                time = sum(int(max(min_time, min(random.gauss(mu,sigma), max_time))) for _ in range({element.numberOfExecutions}))
                with open('files/results_{next(iter(elements))}.txt', 'a') as f:
                    f.write(f'''
{{name}}: [type={element.bpmn_type}, name={element.name}, id_bpmn={{TaskName}}, userTask={{userTask}}, numberOfExecutions={element.numberOfExecutions}, time={{time}}, subTask="{element.subTask}", startTime={{env.now}}]''')
                yield env.timeout(time)
                user_resources[userTask].release(req)
        else:
            time_standby_start = env.now
            requests_direct = {{user: user_resources[user].request() for user in users_direct}}
            requests_roles = {{user: user_resources[user].request() for user in users_roles}}
            all_requests = list(requests_direct.values()) + list(requests_roles.values())
            result = yield simpy.AnyOf(env, all_requests)
            userTask = None
            for user, req in requests_direct.items():
                if req in result.events:
                    userTask = user
                    break
            if userTask is None:
                for user, req in requests_roles.items():
                    if req in result.events:
                        userTask = user
                        break
            for user, req in {{**requests_direct, **requests_roles}}.items():
                if req not in result.events:
                    req.cancel()

            standby_end_time = env.now
            standby_duration = standby_end_time - time_standby_start
            with open('files/results_Process_1.txt', 'a') as f:
                f.write(f'''
{{name}}: StandBy on task {{TaskName}}, start at {{time_standby_start}}, stops at {{standby_end_time}}, duration of {{standby_duration}}''')
            min_time = {element.minimumTime}
            max_time = {element.maximumTime}
            mu = (min_time+max_time)/2
            sigma = (max_time-min_time)/6
            time = sum(int(max(min_time, min(random.gauss(mu,sigma), max_time))) for _ in range({element.numberOfExecutions}))
            with open('files/results_Process_1.txt', 'a') as f:
                f.write(f'''
{{name}}: [type={element.bpmn_type}, name={element.name}, id_bpmn={{TaskName}}, userTask={{userTask}}, numberOfExecutions={element.numberOfExecutions}, time={{time}}, subTask="{element.subTask}", startTime={{env.now}}]''')
            yield env.timeout(time)
            user_resources[userTask].release(req)
    return '{element.subTask}'
"""
    return generateFunction(elements, element.subTask, script + functionStr)

def parallelGateway(elements, element, script):
    possibleElements, _ = getPercentOfBranches(elements, element.id_bpmn)
    functionStr = f"""
def {element.id_bpmn}(env, name):
    strSelectedElements = ", ".join({possibleElements})
    with open('files/results_{next(iter(elements))}.txt', 'a') as f:
        f.write(f'''
{{name}}: [type={element.bpmn_type}, name={element.name}, id_bpmn={element.id_bpmn}, subTask="{{strSelectedElements}}", startTime={{env.now}}]''')
    yield env.timeout(0)
    return {possibleElements}
    """
    extendedScript = script + functionStr
    for elem in possibleElements:
        if elem not in script:
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
    with open('files/results_{next(iter(elements))}.txt', 'a') as f:
        f.write(f'''
{{name}}: [type={element.bpmn_type}, name={element.name}, id_bpmn={element.id_bpmn}, subTask="{{strSelectedElements}}", startTime={{env.now}}]''')
    yield env.timeout(0)
    return selectedElements
    """
    extendedScript = script + functionStr
    for elem in possibleElements:
        if elem not in script:
            extendedScript = generateFunction(elements, elem, extendedScript)
    return extendedScript

def endEvent(elements, element, script):
    functionStr = f"""
def {element.id_bpmn}(env, name):
    with open('files/results_{next(iter(elements))}.txt', 'a') as f:
        f.write(f'''
{{name}}: [type={element.bpmn_type}, name={element.name}, id_bpmn={element.id_bpmn}, subTask="", startTime={{env.now}}]''')
    yield env.timeout(0)
    """
    return script + functionStr

def generateFunction(elements, elementId, script):
    element = elements[elementId]
    elementType = type(element).__name__
    if elementType == "BPMNExclusiveGateway":
        return exclusiveGateway(elements, element, script)
    elif elementType == "BPMNTask":
        return task(elements, element, script)
    elif elementType == "BPMNManualTask":
        return manualTask(elements, element, script)
    elif elementType == "BPMNUserTask":
        return userTask(elements, element, script)
    elif elementType == "BPMNParallelGateway":
        return parallelGateway(elements, element, script)
    elif elementType == "BPMNInclusiveGateway":
        return inclusiveGateway(elements, element, script)
    elif elementType == "BPMNEndEvent":
        return endEvent(elements, element, script)

def serviceTask(elements):
    script = f"""
def checkServiceTasks(name):
    with open('files/results_{next(iter(elements))}.txt', 'r') as f:
        content = f.readlines()"""
    for element in elements.values():
        if element.bpmn_type == 'bpmn:ServiceTask':
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
        if name in line and 'id_bpmn={element.id_bpmn}' in line:
            found1 = True
        for activity in activities:
            if name in line and f'id_bpmn={{activity}}' in line:
                activities[activity] = True
                last_activity_index = line_index
    number_found = sum(activities.values())
    if not found1 and number_found >= 1 and last_activity_index != -1:
        subtasks_str = ", ".join([activity for activity, found in activities.items() if found])
        new_line = f'''{{name}}: [type={element.bpmn_type}, name={element.name}, id_bpmn={element.id_bpmn}, sodSecurity={element.sodSecurity}, bodSecurity={element.bodSecurity}, uocSecurity={element.uocSecurity}, nu={element.nu}, mth={element.mth}, subTask="{{subtasks_str}}"]\\n'''
        content.insert(last_activity_index + 1, new_line)
    """
    script += f"""
    with open('files/results_{next(iter(elements))}.txt', 'w') as f:
        f.writelines(content)
    """
    return script

def generateScript(content):
    elements, process, start = parse_bpmn_elements(content)
    elementProcess = elements[process]
    script = f"""
import simpy
import random

nInstances = {elementProcess.instances}
frequency = {elementProcess.frequency}
rolePool = {elementProcess.userWithRole}
userWithRole = list(set(value for sublist in rolePool.values() for value in sublist))
userWithoutRole = {elementProcess.userWithoutRole}
userPool = userWithRole + userWithoutRole

def resolve_possible_users(possibleUsers):
    users_direct = []
    users_roles = []
    for item in possibleUsers:
        if item in userWithRole:
            users_roles.append(item)
        elif item in rolePool:
            users_roles.extend(rolePool[item])
        elif item in userWithoutRole:
            users_direct.append(item)
    return users_direct, users_roles
"""
    global user_resources
    script += "user_resources = {}\n"
    startEvent = elements[start]
    script = generateFunction(elements, startEvent.subTask, script)
    scriptServiceTask = serviceTask(elements)
    scriptMainFunction = f"""
def process_task(env, name, task_name):
    task_func = globals()[task_name]
    result = yield env.process(task_func(env, name))
    if result:
        if isinstance(result, list):
            for next_task in result:
                env.process(process_task(env, name, next_task))
        else:
            env.process(process_task(env, name, result))

def start_process(env, name):
    yield env.process(process_task(env, name, '{startEvent.subTask}'))

def main(env):
    global user_resources
    user_resources = {{user: simpy.Resource(env, capacity=1) for user in userPool}}
    with open('files/results_{next(iter(elements))}.txt', 'a') as f:
        f.write(f"Element: [type={elementProcess.bpmn_type}, name={elementProcess.name}, id_bpmn={elementProcess.id_bpmn}, instances={{nInstances}}, frequency={{frequency}}, userWithoutRole={elementProcess.userWithoutRole}, userWithRole=""" + '{' + f'{elementProcess.userWithRole}' + '}' + f"""]")
    for i in range(nInstances):
        with open('files/results_{next(iter(elements))}.txt', 'a') as f:
            f.write(f'''
Instance {{i + 1}}: [type={startEvent.bpmn_type}, name={startEvent.name}, id_bpmn={startEvent.id_bpmn}, subTask="{startEvent.subTask}", startTime={{env.now}}]''')
        env.process(start_process(env, f'Instance {{i + 1}}'))
        yield env.timeout(frequency)

env = simpy.Environment()
env.process(main(env))
env.run()
for i in range(nInstances):
    checkServiceTasks(f'Instance {{i + 1}}')
    """
    return script + scriptServiceTask + scriptMainFunction, process
