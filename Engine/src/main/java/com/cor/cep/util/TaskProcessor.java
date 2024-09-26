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
                    List<Task> tasks = parseTaskFile(file.getAbsolutePath());
                    for (Task task : tasks) {
                        taskEventHandler.handle(task);
                    }
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
                if (line.startsWith("Element:")) {
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
    String type = null, name = null, idBpmn = null, user = null, log = null;
    List<String> subTasks = new ArrayList<>();
    boolean sodSecurity = false, bodSecurity = false, uocSecurity = false;
    long timestamp = 0;
    int nu = 0, mth = 0, p = 0;

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
                idBpmn = keyValue[1].trim();  // Ensure this correctly assigns to idBpmn
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
            case "timestamp":
                timestamp = Long.parseLong(keyValue[1].trim());
                break;
            case "nu":
                nu = Integer.parseInt(keyValue[1].trim());
                break;
            case "mth":
                mth = Integer.parseInt(keyValue[1].trim());
                break;
            case "p":
                p = Integer.parseInt(keyValue[1].trim());
                break;
            case "user":
            case "userTask":  // Include both "user" and "userTask" cases
                user = keyValue[1].trim();
                break;
            case "log":
                log = keyValue[1].trim();
                break;
            case "subTask":
                subTasks = Arrays.asList(keyValue[1].trim().split("\\s*,\\s*"));
                break;
        }
    }

    // Log all fields to verify
    LOG.info("Parsed Task - idBpmn: {}, user: {}, subTasks: {}, sodSecurity: {}", idBpmn, user, subTasks, sodSecurity);

    return new Task(type, name, idBpmn, sodSecurity, bodSecurity, uocSecurity, timestamp, nu, mth, p, user, log, subTasks);
}


}
