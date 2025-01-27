from heatMap.getTimeDict import getTimeDict
from heatMap.getTotalTime import getTotalTime


def getColor(value):
    totalTime = getTotalTime()
    if value <= 0:
        return "#00CC00"
    elif value >= totalTime:
        return "#CC0000"

    normalized_value = value / totalTime

    if normalized_value <= 0.5:
        red = int(2 * normalized_value * 255)
        green = 255
        blue = 0
    else:
        red = 255
        green = int((1 - 2 * (normalized_value - 0.5)) * 255)
        blue = 0

    darkening_factor = 0.8
    red = int(red * darkening_factor)
    green = int(green * darkening_factor)

    hex_color = f"rgba({red}, {green}, {blue})"
    return hex_color


def getColorDict():
    elementTimeDict, flowTimeDict = getTimeDict()
    elementColorDict = {}
    flowColorDict = {}
    for element, time in elementTimeDict.items():
        elementColorDict[element] = getColor(time)
    for element, time in flowTimeDict.items():
        flowColorDict[element] = getColor(time)
    return elementColorDict, flowColorDict