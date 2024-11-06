import os
from heatMap.getTimeDict import parseKeyValuePairs
def getTotalTime(process):
    scriptDir = os.path.dirname(__file__)
    resultsFile = os.path.join(os.path.dirname(scriptDir), 'files', f'results_{process}.txt')
    with open(resultsFile, 'r') as f:
        line = f.readlines()[-1]
    keyValuePairs = parseKeyValuePairs(line)

    return int(keyValuePairs['startTime'])