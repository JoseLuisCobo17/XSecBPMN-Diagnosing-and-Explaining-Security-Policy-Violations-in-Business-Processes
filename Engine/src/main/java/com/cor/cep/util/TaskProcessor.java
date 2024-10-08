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
                    List<Task> tasks = parseTaskFile(file.getAbsolutePath());
    
                    // Agrupar tareas por startTime o tareas con propiedades de seguridad activas
                    Map<Long, List<Task>> groupedTasks = tasks.stream()
                            .filter(task -> task.getStartTime() != null || 
                                            task.isBodSecurity() || 
                                            task.isSodSecurity() || 
                                            task.isUocSecurity())
                            .collect(Collectors.groupingBy(
                                task -> task.getStartTime() != null ? task.getStartTime() : -1L, 
                                TreeMap::new, Collectors.toList()));
    
                    // Procesar las tareas agrupadas
                    for (Map.Entry<Long, List<Task>> entry : groupedTasks.entrySet()) {
                        Long startTime = entry.getKey();
                        List<Task> taskList = entry.getValue();
    
                        // Imprimir solo una vez el startTime o "Sin StartTime" si es nulo
                        if (startTime == -1L) {
                            LOG.info("Enviando tarea sin startTime, con security task activa:");
                        } else {
                            LOG.info("Enviando tarea con startTime: {}", startTime);
                        }
    
                        // Imprimir cada tarea con la instancia correspondiente
                        taskList.forEach(task -> 
                            LOG.info("Instancia {}: {}", task.getInstance(), task));
                    }
    
                    // Manejar cada tarea individualmente para enviar eventos a Esper
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
        String type = null, name = null, idBpmn = null;
        List<String> subTasks = new ArrayList<>();
        List<String> userTasks = new ArrayList<>();
        boolean sodSecurity = false, bodSecurity = false, uocSecurity = false;
        Integer nu = null, mth = null, instance = null;
        Long startTime = null; 
        Long time = null;
    
        if (line.startsWith("Instance")) {
            String instancePart = line.substring(0, line.indexOf(":")).trim();
            String[] instanceParts = instancePart.split(" ");
            if (instanceParts.length == 2) {
                try {
                    instance = Integer.parseInt(instanceParts[1]);
                } catch (NumberFormatException e) {
                    LOG.error("Error parsing instance number", e);
                }
            }
            line = line.substring(line.indexOf("["));
        }
    
        String content = line.substring(line.indexOf("[") + 1, line.lastIndexOf("]"));
        String[] parts = content.split(", (?=[a-zA-Z_]+=)");
    
        for (String part : parts) {
            String[] keyValue = part.split("=", 2);
            if (keyValue.length != 2) {
                continue;  // Saltar partes que no coinciden con el patrón "key=value"
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
                    sodSecurity = Boolean.parseBoolean(keyValue[1].trim().toLowerCase()); // Normalizar a minúsculas
                    break;
                case "bodSecurity":
                    bodSecurity = Boolean.parseBoolean(keyValue[1].trim().toLowerCase()); // Normalizar a minúsculas
                    break;
                case "uocSecurity":
                    uocSecurity = Boolean.parseBoolean(keyValue[1].trim().toLowerCase()); // Normalizar a minúsculas
                    break;
                case "nu":
                    nu = Integer.parseInt(keyValue[1].trim());
                    break;
                case "mth":
                    mth = Integer.parseInt(keyValue[1].trim());
                    break;
                case "userTask":
                    userTasks.add(keyValue[1].trim().replace("\"", ""));
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
    
        // Agregar un log para verificar los valores asignados
        LOG.debug("Task parsed: idBpmn={}, bodSecurity={}, sodSecurity={}, uocSecurity={}, subTasks={}, userTasks={}",
                  idBpmn, bodSecurity, sodSecurity, uocSecurity, subTasks, userTasks);
    
        // Devuelve la nueva instancia de la tarea
        return new Task(type, name, idBpmn, nu, mth, subTasks, userTasks, bodSecurity, sodSecurity, uocSecurity, startTime, time, instance);
    }    
    
}
