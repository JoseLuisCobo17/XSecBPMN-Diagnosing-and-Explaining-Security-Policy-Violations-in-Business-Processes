import os

scriptDir = os.path.dirname(__file__)
rulesFile = os.path.join(os.path.dirname(scriptDir), 'files', 'esperTasks.txt')

def splitUnUnquotedCommas(s):
    parts = []
    current = ''
    inQuotes = False
    i = 0
    while i < len(s):
        c = s[i]
        if c == '"':
            inQuotes = not inQuotes
            current += c
        elif c == ',' and not inQuotes:
            parts.append(current)
            current = ''
        else:
            current += c
        i += 1
    if current:
        parts.append(current)
    return parts

def parseKeyValuePairs(s):
    parts = splitUnUnquotedCommas(s)
    result = {}
    for part in parts:
        if '=' in part:
            key, value = part.split('=', 1)
            key = key.strip()
            value = value.strip()
            if value.startswith('"') and value.endswith('"'):
                value = value[1:-1]
            result[key] = value
    return result

def parseResultsFile():
    resultsFile = os.path.join(os.path.dirname(scriptDir), 'files', f'resultSimulation.txt')
    elementTimeDict = {}
    standbyTimes = {}
    standbyMessageTimes = {}
    standbyDataTimes = {}
    with open(resultsFile, 'r') as f:
        for line in f:
            line = line.strip()
            if '[' in line and ']' in line:
                content = line[line.index('[')+1 : line.rindex(']')]
                keyValuePairs = parseKeyValuePairs(content)
                if line.startswith('Instance') and 'type=StandBy' not in line:
                    if 'id_bpmn' in keyValuePairs and 'time' in keyValuePairs:
                        idBpmn = keyValuePairs['id_bpmn']
                        timeValue = int(keyValuePairs['time'])
                        elementTimeDict[idBpmn] = elementTimeDict.get(idBpmn, 0) + timeValue
                elif 'type=StandBy,' in line:
                    idBpmn = keyValuePairs.get('id_bpmn')
                    timeValue = keyValuePairs.get('time')
                    if idBpmn and timeValue:
                        timeValue = int(timeValue)
                        standbyTimes[idBpmn] = standbyTimes.get(idBpmn, 0) + timeValue
                elif 'type=StandByMessage,' in line:
                    idBpmn = keyValuePairs.get('id_bpmn')
                    timeValue = keyValuePairs.get('time')
                    if idBpmn and timeValue:
                        timeValue = int(timeValue)
                        standbyMessageTimes[idBpmn] = standbyMessageTimes.get(idBpmn, 0) + timeValue
                elif 'type=StandByData,' in line:
                    idBpmn = keyValuePairs.get('id_bpmn')
                    timeValue = keyValuePairs.get('time')
                    if idBpmn and timeValue:
                        timeValue = int(timeValue)
                        standbyDataTimes[idBpmn] = standbyDataTimes.get(idBpmn, 0) + timeValue
    return elementTimeDict, standbyTimes, standbyMessageTimes, standbyDataTimes

def parseRulesFile():
    sequenceFlowMap = {}
    messageFlowMap = {}
    dataFlowMap = {}
    dataObjectMap = {}
    dataObjects = {}
    with open(rulesFile, 'r') as f:
        for line in f:
            line = line.strip()
            if line.startswith('Element') and '[' in line and ']' in line:
                content = line[line.index('[')+1 : line.rindex(']')]
                keyValuePairs = parseKeyValuePairs(content)
                if 'type=bpmn:SequenceFlow' in line:
                    id_bpmn = keyValuePairs.get('id_bpmn')
                    subElement = keyValuePairs.get('subElement')
                    if id_bpmn and subElement:
                        sequenceFlowMap[id_bpmn] = subElement
                elif 'type=bpmn:MessageFlow' in line:
                    id_bpmn = keyValuePairs.get('id_bpmn')
                    subElement = keyValuePairs.get('subElement')
                    if id_bpmn and subElement:
                        messageFlowMap[id_bpmn] = subElement
                elif 'type=bpmn:DataInputAssociation' in line:
                    id_bpmn = keyValuePairs.get('id_bpmn')
                    subElement = keyValuePairs.get('subElement')
                    superElement = keyValuePairs.get('superElement')
                    if id_bpmn and superElement:
                        dataObjectMap[superElement] = subElement
                    if superElement:
                        dataObjects.setdefault(superElement, []).append(id_bpmn)
                elif 'type=bpmn:DataOutputAssociation' in line:
                    id_bpmn = keyValuePairs.get('id_bpmn')
                    subElement = keyValuePairs.get('subElement')
                    if subElement:
                        dataObjects.setdefault(subElement, []).append(id_bpmn)
    for dataObject, dataFlows in dataObjects.items():
        element = dataObjectMap.get(dataObject)
        if element:
            for dataFlow in dataFlows:
                dataFlowMap[dataFlow] = element
    return sequenceFlowMap, messageFlowMap, dataFlowMap, dataObjectMap

def getTimeDict():
    elementTimeDict, standbyTimes, standbyMessageTimes, standbyDataTimes = parseResultsFile()
    sequenceFlowMap, messageFlowMap, dataFlowMap, dataObjectMap = parseRulesFile()
    flowTimeDict = {}
    for seqFlowId, subElementId in sequenceFlowMap.items():
        totalStandby = standbyTimes.get(subElementId, 0)
        if totalStandby != 0:
            flowTimeDict[seqFlowId] = totalStandby
    for mesFlowId, subElementId in messageFlowMap.items():
        totalStandby = standbyMessageTimes.get(subElementId, 0)
        if totalStandby != 0:
            flowTimeDict[mesFlowId] = totalStandby
    for dataFlowId, subElementId in dataFlowMap.items():
        totalStandby = standbyDataTimes.get(subElementId, 0)
        if totalStandby != 0:
            flowTimeDict[dataFlowId] = totalStandby
    for dataObjectId, subElementId in dataObjectMap.items():
        totalStandby = standbyDataTimes.get(subElementId, 0)
        if totalStandby != 0:
            elementTimeDict[dataObjectId] = totalStandby

    return elementTimeDict, flowTimeDict
