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
import java.util.List;
import java.util.Map;
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
                    LOG.info("Processing file: " + file.getName());
// En TaskProcessor.java
List<Task> tasks = parseTaskFile(file.getAbsolutePath());

// Filtrar tareas con startTime no nulo y agruparlas en un TreeMap para ordenarlas
Map<Long, List<Task>> groupedTasks = tasks.stream()
        .filter(task -> task.getStartTime() != null) // Filtrar startTime no nulos
        .collect(Collectors.groupingBy(Task::getStartTime, TreeMap::new, Collectors.toList())); // Usar TreeMap para ordenar

// Imprimir las tareas agrupadas y ordenadas
groupedTasks.forEach((startTime, taskList) -> {
    LOG.info("Tasks grouped by startTime: {}", startTime);
    taskList.forEach(task -> LOG.info("{}", task));
});

// Llama a handleTasks en lugar de handle
taskEventHandler.handleTasks(tasks);

                }
            }
        } else {
            LOG.error("No files found in the directory: " + directoryPath);
        }
    }

    private List<Task> parseTaskFile(String filePath) {
        List<Task> tasks = new ArrayList<>();
        try (BufferedReader br = new BufferedReader(new FileReader(filePath))) {
            String line;
            while ((line = br.readLine()) != null) {
                if (line.startsWith("Element:") || line.startsWith("Instance")) {
                    Task task = parseTaskLine(line);
                    if (task != null) {
                        tasks.add(task);
                    }
                }
            }
        } catch (IOException e) {
            LOG.error("Error reading the task file", e);
        }
        return tasks;
    }

    private Task parseTaskLine(String line) {
        // Extract the content within brackets
        String content = line.substring(line.indexOf("[") + 1, line.lastIndexOf("]"));

        // Initialize variables
        String type = null, name = null, idBpmn = null;
        List<String> subTasks = new ArrayList<>();
        List<String> userTasks = new ArrayList<>();
        boolean sodSecurity = false, bodSecurity = false, uocSecurity = false;
        Integer nu = null, mth = null;
        Long startTime = null; // Propiedad existente
        Long time = null; // Nueva propiedad

        // Split content by ', ' ensuring sub-tasks aren't broken
        String[] parts = content.split(", (?=[a-zA-Z_]+=)");

        for (String part : parts) {
            String[] keyValue = part.split("=", 2);
            if (keyValue.length != 2) {
                continue;  // Skip parts that do not match the "key=value" pattern
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
                    sodSecurity = Boolean.parseBoolean(keyValue[1].trim());
                    break;
                case "bodSecurity":
                    bodSecurity = Boolean.parseBoolean(keyValue[1].trim());
                    break;
                case "uocSecurity":
                    uocSecurity = Boolean.parseBoolean(keyValue[1].trim());
                    break;
                case "nu":
                    nu = Integer.parseInt(keyValue[1].trim());
                    break;
                case "mth":
                    mth = Integer.parseInt(keyValue[1].trim());
                    break;
                case "userTask":
                    userTasks.add(keyValue[1].trim());
                    break;
                case "subTask":
                    subTasks = Arrays.asList(keyValue[1].replace("\"", "").trim().split("\\s*,\\s*"));
                    break;
                case "startTime":
                    startTime = Long.parseLong(keyValue[1].trim());
                    break;
                case "time":
                    time = Long.parseLong(keyValue[1].trim());
                    break;
            }
        }

        // Return a new Task with the correct parameters for the constructor
        return new Task(type, name, idBpmn, nu, mth, subTasks, userTasks, sodSecurity, bodSecurity, uocSecurity, startTime, time);
    }
}
