from heatMap.getColorDict import getColorDict
import os

def getHeatMap():
    scriptDir = os.path.dirname(__file__)
    diagramFile = os.path.join(os.path.dirname(scriptDir), 'files', 'diagram.bpmn')
    elementColorDict, flowColorDict = getColorDict()
    with open(diagramFile, 'r') as f:
        file = f.read()
    for element, color in elementColorDict.items():
        oldString = f'bpmnElement="{element}"'
        newString = f'bpmnElement="{element}" bioc:fill="{color}"'
        file = file.replace(oldString, newString)
    for flow, color in flowColorDict.items():
        oldString = f'bpmnElement="{flow}"'
        newString = f'bpmnElement="{flow}" color:border-color="{color}"'
        file = file.replace(oldString, newString)
    with open(diagramFile, 'w') as f:
        f.write(file)







