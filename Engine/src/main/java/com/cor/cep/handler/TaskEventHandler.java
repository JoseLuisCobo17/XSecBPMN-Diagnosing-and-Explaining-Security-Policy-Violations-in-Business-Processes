package com.cor.cep.handler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

import com.cor.cep.event.Task;
import com.espertech.esper.common.client.configuration.Configuration;
import com.espertech.esper.compiler.client.CompilerArguments;
import com.espertech.esper.compiler.client.EPCompiler;
import com.espertech.esper.compiler.client.EPCompilerProvider;
import com.espertech.esper.common.client.EPCompiled;
import com.espertech.esper.runtime.client.EPDeployment;
import com.espertech.esper.runtime.client.EPRuntime;
import com.espertech.esper.runtime.client.EPRuntimeProvider;
import com.espertech.esper.runtime.client.EPStatement;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Collectors;

import com.espertech.esper.common.client.PropertyAccessException;

@Component
@Scope(value = "singleton")
public class TaskEventHandler implements InitializingBean {

    private static final Logger LOG = LoggerFactory.getLogger(TaskEventHandler.class);
    private EPRuntime epRuntime;
    private StringBuilder sb = new StringBuilder();
    private Set<String> reportedBodViolations = new HashSet<>();
    private Set<String> reportedSodViolations = new HashSet<>();
    private Set<String> reportedUocViolations = new HashSet<>();

    public void initService() {
        LOG.debug("Initializing Service ..");
        Configuration configuration = new Configuration();
        configuration.getCommon().addEventType(Task.class);

        epRuntime = EPRuntimeProvider.getDefaultRuntime(configuration);

        File currentDir = new File(System.getProperty("user.dir"));
        File[] listOfFiles = currentDir.listFiles((dir, name) -> name.toLowerCase().endsWith(".txt"));

        Set<String> listaStrings = new HashSet<>();

        if (listOfFiles != null) {
            for (File file : listOfFiles) {
                if (file.isFile()) {
                    listaStrings.addAll(obtenerUserTaskDesdeArchivo(file.getAbsolutePath()));
                }
            }
            
        } else {
            LOG.error("No files found in the current working directory: " + currentDir.getAbsolutePath());
            return; 
        }

        try {
            EPCompiler compiler = EPCompilerProvider.getCompiler();
            CompilerArguments args = new CompilerArguments(configuration);

LOG.debug("Creating Generalized BoD Check Expression");
String bodEPL = "select parent.idBpmn as parentId, " +
    "sub1.idBpmn as subTask1Id, sub2.idBpmn as subTask2Id, " +
    "sub1.userTask as user1, sub2.userTask as user2, " +
    "sub1.instance as instance1 " +
    "from Task#keepall as parent, Task#keepall as sub1, Task#keepall as sub2 " +
    "where parent.bodSecurity = true " +
    "and sub1.userTask is not null and sub2.userTask is not null " +
    "and sub1.userTask != sub2.userTask " +
    "and sub1.idBpmn != sub2.idBpmn " +
    "and sub1.idBpmn in (parent.subTasks) " +
    "and sub2.idBpmn in (parent.subTasks) " +
    "and sub1.instance = sub2.instance";

EPCompiled compiledBod = compiler.compile(bodEPL, args);
EPDeployment deploymentBod = epRuntime.getDeploymentService().deploy(compiledBod);
EPStatement statementBod = deploymentBod.getStatements()[0];

statementBod.addListener((newData, oldData, stat, rt) -> {
    if (newData != null && newData.length > 0) {
        String parentId = (String) newData[0].get("parentId");
        String subTask1Id = (String) newData[0].get("subTask1Id");
        String subTask2Id = (String) newData[0].get("subTask2Id");
        String user1 = (String) newData[0].get("user1");
        String user2 = (String) newData[0].get("user2");
        Integer instance1 = (Integer) newData[0].get("instance1");
        String violationKey = parentId + "|" + subTask1Id + "|" + subTask2Id + "|" + instance1;
        String violationKey2 = parentId + "|" + subTask2Id + "|" + subTask1Id + "|" + instance1;
        
        if (!reportedBodViolations.contains(violationKey) && !reportedBodViolations.contains(violationKey2)) {
            reportedBodViolations.add(violationKey);
            reportedBodViolations.add(violationKey2);

            sb.append("\n---------------------------------");
            sb.append("\n- [BOD MONITOR] Binding of Duties violation detected:");
            sb.append("\n- Parent Task ID: ").append(parentId);
            sb.append("\n- SubTask 1 ID: ").append(subTask1Id);
            sb.append("\n- SubTask 2 ID: ").append(subTask2Id);
            sb.append("\n- Executed By Users: ").append(user1).append(" and ").append(user2);
            sb.append("\n- Instance: ").append(instance1);
            sb.append("\n---------------------------------");
        } else {
            LOG.debug("BoD violation already reported for key: " + violationKey);
        }
    }
});

LOG.debug("Creating StandBy Check Expression");
String standByEPL = "select * from Task where stopTime is not null";


EPCompiled compiledStandBy = compiler.compile(standByEPL, args);
EPDeployment deploymentStandBy = epRuntime.getDeploymentService().deploy(compiledStandBy);
EPStatement statementStandBy = deploymentStandBy.getStatements()[0];

statementStandBy.addListener((newData, oldData, stat, rt) -> {
    
    if (newData != null && newData.length > 0) {
        String idBpmn = (String) newData[0].get("idBpmn");
        Long startTime = (Long) newData[0].get("startTime");
        Long stopTime = (Long) newData[0].get("stopTime");
        Long time = (Long) newData[0].get("time");
        Integer instance = (Integer) newData[0].get("instance");

        String violationMessage = String.format(
            "Instance %d: StandBy on task %s, start at %d, stops at %d, duration of %d", 
            instance, idBpmn, startTime, stopTime, time
        );

        sb.append("\n---------------------------------");
        sb.append("\n- [STANDBY VIOLATION] Detected:");
        sb.append("\n").append(violationMessage);
        sb.append("\n---------------------------------");
    }
});

LOG.debug("Creating Generalized SoD Check Expression");
String sodEPL = "select parent.idBpmn as parentId, " +
                "sub1.idBpmn as subTask1Id, sub2.idBpmn as subTask2Id, " +
                "sub1.userTask as userTask1, sub2.userTask as userTask2, " +
                "sub1.instance as instance1 " +
                "from Task#keepall as parent, Task#keepall as sub1, Task#keepall as sub2 " +
                "where parent.sodSecurity = true " +  
                "and sub1.idBpmn != sub2.idBpmn " +  
                "and sub1.idBpmn in (parent.subTasks) " +  
                "and sub2.idBpmn in (parent.subTasks) " +  
                "and sub1.instance = sub2.instance " +  
                "and sub1.userTask is not null " +
                "and sub2.userTask is not null " + 
                "and sub1.userTask = sub2.userTask " +
                "and sub1.idBpmn < sub2.idBpmn";

EPCompiled compiledSod = compiler.compile(sodEPL, args);
EPDeployment deploymentSod = epRuntime.getDeploymentService().deploy(compiledSod);
EPStatement statementSod = deploymentSod.getStatements()[0];

statementSod.addListener((newData, oldData, stat, rt) -> {
    if (newData != null && newData.length > 0) {
        String parentId = (String) newData[0].get("parentId");
        String subTask1Id = (String) newData[0].get("subTask1Id");
        String subTask2Id = (String) newData[0].get("subTask2Id");
        String userTask1 = (String) newData[0].get("userTask1");
        Integer instance1 = (Integer) newData[0].get("instance1");

        String violationKey = parentId + "|" + subTask1Id + "|" + subTask2Id + "|" + instance1;
        String violationKey2 = parentId + "|" + subTask2Id + "|" + subTask1Id + "|" + instance1;

        if (!reportedSodViolations.contains(violationKey) && !reportedSodViolations.contains(violationKey2)) {
            reportedSodViolations.add(violationKey);
            reportedSodViolations.add(violationKey2);

            sb.append("\n---------------------------------");
            sb.append("\n- [SOD MONITOR] Segregation of Duties violation detected:");
            sb.append("\n- Parent Task ID: ").append(parentId);
            sb.append("\n- SubTask 1 ID: ").append(subTask1Id);
            sb.append("\n- SubTask 2 ID: ").append(subTask2Id);
            sb.append("\n- Executed By User: ").append(userTask1);
            sb.append("\n- Instance: ").append(instance1);
            sb.append("\n---------------------------------");
        } else {
            LOG.debug("SoD violation already reported for key: " + violationKey);
        }
    }
});

LOG.debug("Creating UoC Check Expression");
String uocEPL = "select parent.idBpmn as parentId, " +
    "sub1.idBpmn as subTaskId, " +
    "sub1.userTask as userTask, " +
    "sub1.instance as instance1, " +
    "sub1.numberOfExecutions as totalExecutions, " +
    "parent.mth as parentMth " +
    "from Task#keepall as parent, Task#keepall as sub1 " +
    "where parent.uocSecurity = true " + 
    "and sub1.idBpmn in (parent.subTasks) " + 
    "and sub1.userTask is not null " + 
    "and sub1.numberOfExecutions > parent.mth " + 
    "group by parent.idBpmn, sub1.idBpmn, parent.mth, sub1.instance";

    EPCompiled compiledUoc = compiler.compile(uocEPL, args);
    EPDeployment deploymentUoc = epRuntime.getDeploymentService().deploy(compiledUoc);
    EPStatement statementUoc = deploymentUoc.getStatements()[0];
    Map<String, Integer> reportedUocViolations = new HashMap<>();

statementUoc.addListener((newData, oldData, stat, rt) -> {
    if (newData != null && newData.length > 0) {
        String parentId = (String) newData[0].get("parentId");
        String subTaskId = (String) newData[0].get("subTaskId");
        String userTask = (String) newData[0].get("userTask");
        Integer totalExecutions = (Integer) newData[0].get("totalExecutions");
        Integer maxTimes = (Integer) newData[0].get("parentMth");
        Integer instance1 = (Integer) newData[0].get("instance1");
        String taskKey = parentId + "|" + subTaskId  + "|" + instance1;
        if (totalExecutions > maxTimes) {
            if (!reportedUocViolations.containsKey(taskKey)) {
                sb.append("\n---------------------------------");
                sb.append("\n- [UOC MONITOR] Usage of Control violation detected:");
                sb.append("\n- Parent Task ID: ").append(parentId);
                sb.append("\n- SubTask ID: ").append(subTaskId);
                sb.append("\n- User(s): ").append(userTask); 
                sb.append("\n- Total number of executions (accumulated): ").append(totalExecutions);
                sb.append("\n- Maximum allowed: ").append(maxTimes != null ? maxTimes : "N/A");
                sb.append("\n- Instance: ").append(instance1);
                sb.append("\n---------------------------------");
                reportedUocViolations.put(taskKey, totalExecutions);
            }
        }
    }
});

        } catch (Exception e) {
            LOG.error("Error compiling or deploying EPL statements", e);
        }
    }

    private Map<Long, List<Task>> taskGroups = new HashMap<>();
    private Set<Long> processedStartTimes = new HashSet<>();

    public void handle(Task event) {
        Long startTime = event.getStartTime();
    
        if (startTime != null || event.isBodSecurity() || event.isSodSecurity() || event.isUocSecurity()) {
            taskGroups.computeIfAbsent(startTime != null ? startTime : -1L, k -> new ArrayList<>()).add(event);
        }
    
        processTaskGroups();
    }    

    private Long previousStartTime = null;

    private void processTaskGroups() {
        taskGroups.forEach((startTime, tasks) -> {
            if (previousStartTime == null || !startTime.equals(previousStartTime)) {
                previousStartTime = startTime;
            }
    
            tasks.forEach(task -> {
                epRuntime.getEventService().sendEventBean(task, "Task");
            });
    
            processedStartTimes.add(startTime);
        });
        taskGroups.clear();
    }
    

public void handleTasks(List<Task> tasks) {
    if (tasks == null || tasks.isEmpty()) {
        LOG.warn("La lista de tareas está vacía o es nula.");
        return;
    }

    Map<Long, List<Task>> groupedTasks = tasks.stream()
        .filter(task -> task.getStartTime() != null || 
            (task.isBodSecurity() || task.isUocSecurity() || task.isSodSecurity())) 
        .collect(Collectors.groupingBy(task -> 
            task.getStartTime() != null ? task.getStartTime() : -1L, 
            TreeMap::new, Collectors.toList()));

    groupedTasks.forEach((startTime, taskList) -> {
        taskList.forEach(task -> {
            epRuntime.getEventService().sendEventBean(task, "Task");
            epRuntime.getEventService().sendEventBean(task, "Task");

        });

        tasks.forEach(task -> {
            epRuntime.getEventService().sendEventBean(task, "Task");
        });
        
    });
}

    private List<Task> obtenerListaDeTareas() {
        return new ArrayList<>(); 
    }

    private Set<String> obtenerUserTaskDesdeArchivo(String rutaArchivo) {
        Set<String> userTask = new HashSet<>();
        try (BufferedReader br = new BufferedReader(new FileReader(rutaArchivo))) {
            String linea;
            while ((linea = br.readLine()) != null) {
                if (linea.contains("userTask=")) {
                    String[] partes = linea.split("userTask=");
                    if (partes.length > 1) {
                        String userTaskValue = partes[1].split(",")[0].trim(); 
                        userTask.add(userTaskValue); 
                    }
                }
            }
        } catch (IOException e) {
            LOG.error("Error reading file: " + rutaArchivo, e);
        }
        return userTask;
    }

    public void writeViolationsToFile(String filename) {
        try (BufferedWriter writer = new BufferedWriter(new FileWriter(filename))) {
            writer.write(sb.toString());
        } catch (IOException e) {
            LOG.error("Error writing violations to file", e);
        }
    }
    
    @Override
    public void afterPropertiesSet() {
        LOG.debug("Configuring..");
        initService();
    }
}
