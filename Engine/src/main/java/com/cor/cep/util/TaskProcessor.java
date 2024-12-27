package com.cor.cep.util;

import com.cor.cep.event.Task;
import com.cor.cep.handler.TaskEventHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Component
public class TaskProcessor {

    private static final Logger LOG = LoggerFactory.getLogger(TaskProcessor.class);

    @Autowired
    private TaskEventHandler taskEventHandler;

    public void processTaskFiles(String directoryPath) {
        File folder = new File(directoryPath);
        File[] listOfFiles = folder.listFiles((dir, name) -> name.toLowerCase().endsWith(".txt"));
        if (listOfFiles != null) {
            for (File file : listOfFiles) {
                if (file.isFile()) {
                    List<Task> tasks = parseTaskFile(file.getAbsolutePath());
                    Map<Long, List<Task>> groupedTasks = tasks.stream()
                            .filter(task -> task.getStartTime() != null || 
                                            task.isBodSecurity() || 
                                            task.isSodSecurity() || 
                                            task.isUocSecurity())
                            .collect(Collectors.groupingBy(
                                task -> task.getStartTime() != null ? task.getStartTime() : -1L, 
                                TreeMap::new, Collectors.toList()));
                    for (Task task : tasks) {
                        taskEventHandler.handle(task);
                    }
                }
                
            }
        } else {
            LOG.error("No files found in the directory: " + directoryPath);
        }
        taskEventHandler.writeViolationsToFile("../Modeler/example/src/files/violations.txt");
    }    
    
    private List<Task> parseTaskFile(String filePath) {
        List<Task> tasks = new ArrayList<>();
        Map<String, String> subTaskUserTaskMap = new HashMap<>();

        try (BufferedReader br = new BufferedReader(new FileReader(filePath))) {
            String line;
            while ((line = br.readLine()) != null) {
                if (line.startsWith("Element:") || line.startsWith("Instance") || line.startsWith("Priority")) {
                    Task task = parseTaskLine(line);
                    if (task != null) {
                        if (task.getUserTask() != null) {
                            subTaskUserTaskMap.put(task.getIdBpmn(), task.getUserTask());
                        }
                        tasks.add(task);
                    }
                }
            }
        } catch (IOException e) {
            LOG.error("Error reading the task file", e);
        }

        for (Task task : tasks) {
            if (task.isBodSecurity()) {
                List<String> userTasksForSubtasks = task.getSubTasks().stream()
                        .map(subTaskUserTaskMap::get)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());
                task.setSubTasksUserTasks(userTasksForSubtasks);
            }
        }
        
        return tasks;
    }

    private Task parseTaskLine(String line) {
        String type = null, name = null, idBpmn = null, userTask = null;
        List<String> subTasks = new ArrayList<>();
        List<String> subTasksUserTasks = new ArrayList<>();
        boolean sodSecurity = false, bodSecurity = false, uocSecurity = false;
        Integer mth = null, instance = null, numberOfExecutions = 1, execution = 0;
        Long startTime = null; 
        Long stopTime = null;
        Long time = null;
    
        if (line.startsWith("Instance")) {
            int colonIndex = line.indexOf(":");
            if (colonIndex != -1) {
                String instancePart = line.substring(0, colonIndex).trim();
                String[] instanceParts = instancePart.split(" ");
                if (instanceParts.length == 2) {
                    try {
                        instance = Integer.parseInt(instanceParts[1]);
                    } catch (NumberFormatException e) {
                        LOG.error("Error parsing instance number", e);
                    }
                }
                line = line.substring(colonIndex + 1).trim();
            } else {
                LOG.error("Instance format incorrect in line: {}", line);
                return null;
            }
        }
    
        int openBracketIndex = line.indexOf("[");
        int closeBracketIndex = line.lastIndexOf("]");
        if (openBracketIndex == -1 || closeBracketIndex == -1) {
            LOG.error("Brackets not found in line: {}", line);
            return null;
        }
    
        String content = line.substring(openBracketIndex + 1, closeBracketIndex);
        String[] parts = content.split(", (?=[a-zA-Z_]+=)");
    
        for (String part : parts) {
            String[] keyValue = part.split("=", 2);
            if (keyValue.length != 2) {
                continue;
            }
            switch (keyValue[0].trim()) {
                case "type":
                    type = keyValue[1].trim();
                    break;
                case "name":
                    name = keyValue[1].trim();
                    break;
                case "id_bpmn":
                    idBpmn = keyValue[1].trim();
                    break;
                case "sodSecurity":
                    sodSecurity = Boolean.parseBoolean(keyValue[1].trim().toLowerCase());
                    break;
                case "bodSecurity":
                    bodSecurity = Boolean.parseBoolean(keyValue[1].trim().toLowerCase());
                    break;
                case "uocSecurity":
                    uocSecurity = Boolean.parseBoolean(keyValue[1].trim().toLowerCase());
                    break;
                case "mth":
                    mth = Integer.parseInt(keyValue[1].trim());
                    break;
                case "userTask":
                    userTask = keyValue[1].trim();
                    break;
                case "subTask":
                    subTasks = Arrays.asList(keyValue[1].replace("\"", "").trim().split("\\s*,\\s*"));
                    break;
                case "startTime":
                    startTime = Long.parseLong(keyValue[1].trim());
                    break;
                case "stopTime":
                    stopTime = Long.parseLong(keyValue[1].trim());
                    break;
                case "time":
                    time = Long.parseLong(keyValue[1].trim());
                    break;
                case "numberOfExecutions":
                    numberOfExecutions = Integer.parseInt(keyValue[1].trim());
                    break;
            }
        }
    
        LOG.debug("Parsed Task: idBpmn={}, bodSecurity={}, sodSecurity={}, uocSecurity={}, subTasks={}, userTask={}, stopTime={}, numberOfExecutions={}, execution={}",
        idBpmn, bodSecurity, sodSecurity, uocSecurity, subTasks, userTask, stopTime, numberOfExecutions, execution);

    return new Task(type, name, idBpmn, mth, subTasks, userTask, bodSecurity, sodSecurity, uocSecurity, startTime, stopTime, time, instance, numberOfExecutions, execution, subTasksUserTasks);
    } 
}   
