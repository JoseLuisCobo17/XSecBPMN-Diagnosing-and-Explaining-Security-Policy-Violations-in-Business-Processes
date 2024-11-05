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


    // Esta función inicializa el servicio de Esper
    public void initService() {
        LOG.debug("Initializing Service ..");
        Configuration configuration = new Configuration();
        configuration.getCommon().addEventType(Task.class);

        epRuntime = EPRuntimeProvider.getDefaultRuntime(configuration);

        // Procesar los archivos .txt en el directorio actual
        File currentDir = new File(System.getProperty("user.dir"));
        File[] listOfFiles = currentDir.listFiles((dir, name) -> name.toLowerCase().endsWith(".txt"));

        Set<String> listaStrings = new HashSet<>();

        if (listOfFiles != null) {
            for (File file : listOfFiles) {
                if (file.isFile()) {
                    LOG.info("Processing file: " + file.getName());
                    listaStrings.addAll(obtenerUserTaskDesdeArchivo(file.getAbsolutePath()));
                    LOG.info(sb.toString());
                }
            }
            
        } else {
            LOG.error("No files found in the current working directory: " + currentDir.getAbsolutePath());
            return; 
        }

        try {
            EPCompiler compiler = EPCompilerProvider.getCompiler();
            CompilerArguments args = new CompilerArguments(configuration);

            // Crear la consulta EPL para BoD
LOG.debug("Creating Generalized BoD Check Expression");
System.out.println("Hola");
String bodEPL = "select parent.idBpmn as parentId, " +
    "sub1.idBpmn as subTask1Id, sub2.idBpmn as subTask2Id, " +
    "sub1.userTask as user1, sub2.userTask as user2, " +
    "sub1.instance as instance1 " +
    "from Task#keepall as parent, Task#keepall as sub1, Task#keepall as sub2 " +
    "where parent.bodSecurity = true " +
    "and sub1.userTask is not null and sub2.userTask is not null " +
    "and sub1.userTask != sub2.userTask " +  // Detectar usuarios diferentes
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

        System.out.println("Evaluando posible violación de BoD:");
        System.out.println("Parent ID: " + parentId);
        System.out.println("SubTask1 ID: " + subTask1Id + ", User1: " + user1);
        System.out.println("SubTask2 ID: " + subTask2Id + ", User2: " + user2);
        System.out.println("Instance: " + instance1);

        // Generar una clave única para evitar duplicados
        String violationKey = parentId + "|" + subTask1Id + "|" + subTask2Id + "|" + instance1;

        if (!reportedBodViolations.contains(violationKey)) {
            reportedBodViolations.add(violationKey);

            // Registrar la violación de BoD
            sb.append("\n---------------------------------");
            sb.append("\n- [BOD MONITOR] Binding of Duties violation detected:");
            sb.append("\n- Parent Task ID: ").append(parentId);
            sb.append("\n- SubTask 1 ID: ").append(subTask1Id);
            sb.append("\n- SubTask 2 ID: ").append(subTask2Id);
            sb.append("\n- Executed By Users: ").append(user1).append(" and ").append(user2);
            sb.append("\n- Instance: ").append(instance1);
            sb.append("\n---------------------------------");

            System.out.println("Violación de BoD detectada entre " + subTask1Id + " y " + subTask2Id +
                " por los usuarios: " + user1 + " y " + user2);
        } else {
            LOG.debug("BoD violation already reported for key: " + violationKey);
        }
    }
});

   // Crear la consulta EPL para tareas de tipo StandBy con stopTime no nulo
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

        // Generar el mensaje de violación
        String violationMessage = String.format(
            "Instance %d: StandBy on task %s, start at %d, stops at %d, duration of %d", 
            instance, idBpmn, startTime, stopTime, time
        );

        // Añadir la violación al StringBuilder
        sb.append("\n---------------------------------");
        sb.append("\n- [STANDBY VIOLATION] Detected:");
        sb.append("\n").append(violationMessage);
        sb.append("\n---------------------------------");

        LOG.info("StandBy violation detected and saved: {}", violationMessage);
    }
});
         
// Crear la consulta EPL para SoD
LOG.debug("Creating Generalized SoD Check Expression");
String sodEPL = "select parent.idBpmn as parentId, " +
                "sub1.idBpmn as subTask1Id, sub2.idBpmn as subTask2Id, " +
                "sub1.userTask as userTask1, sub2.userTask as userTask2, " +
                "sub1.instance as instance1 " +
                "from Task#keepall as parent, Task#keepall as sub1, Task#keepall as sub2 " +
                "where parent.sodSecurity = true " +  // El padre tiene SoD habilitado
                "and sub1.idBpmn != sub2.idBpmn " +  // Sub-tareas diferentes
                "and sub1.idBpmn in (parent.subTasks) " +  // sub1 es sub-tarea de parent
                "and sub2.idBpmn in (parent.subTasks) " +  // sub2 es sub-tarea de parent
                "and sub1.instance = sub2.instance " +  // Misma instancia
                "and sub1.userTask is not null " +  // userTask no es nulo para sub1
                "and sub2.userTask is not null " +  // userTask no es nulo para sub2
                "and sub1.userTask = sub2.userTask " +  // Mismo usuario realiza ambas tareas
                "and sub1.idBpmn < sub2.idBpmn";  // Evita pares simétricos

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

        // Generar una clave única para evitar duplicados
        String violationKey = parentId + "|" + subTask1Id + "|" + subTask2Id + "|" + instance1;

        if (!reportedSodViolations.contains(violationKey)) {
            reportedSodViolations.add(violationKey);

            // Registrar la violación de SoD
            sb.append("\n---------------------------------");
            sb.append("\n- [SOD MONITOR] Segregation of Duties violation detected:");
            sb.append("\n- Parent Task ID: ").append(parentId);
            sb.append("\n- SubTask 1 ID: ").append(subTask1Id);
            sb.append("\n- SubTask 2 ID: ").append(subTask2Id);
            sb.append("\n- Executed By User: ").append(userTask1);
            sb.append("\n- Instance: ").append(instance1);
            sb.append("\n---------------------------------");

            System.out.println("Violación de SoD detectada entre " + subTask1Id + " y " + subTask2Id +
                " por el usuario: " + userTask1);
        } else {
            LOG.debug("SoD violation already reported for key: " + violationKey);
        }
    }
});

// Crear la consulta EPL para UoC
LOG.debug("Creating UoC Check Expression");
String uocEPL = "select parent.idBpmn as parentId, " +
    "sub1.idBpmn as subTaskId, " +
    "sub1.userTask as userTask, " +
    "sub1.instance as instance1, " +
    "sub1.numberOfExecutions as totalExecutions, " +
    "parent.mth as parentMth " +
    "from Task#keepall as parent, Task#keepall as sub1 " +
    "where parent.uocSecurity = true " +  // Parent task has UoC enabled
    "and sub1.idBpmn in (parent.subTasks) " +  // Ensure sub1 is a sub-task of parent
    "and sub1.userTask is not null " +  // Ensure userTask is not null for sub1
    "group by parent.idBpmn, sub1.idBpmn, parent.mth " +  // Added parent.mth to the GROUP BY clause
    "having sum(sub1.numberOfExecutions) > parent.mth";  // Ensure the sum of executions exceeds parent.mth

    EPCompiled compiledUoc = compiler.compile(uocEPL, args);
    EPDeployment deploymentUoc = epRuntime.getDeploymentService().deploy(compiledUoc);
    EPStatement statementUoc = deploymentUoc.getStatements()[0];

// Map para acumular ejecuciones por sub-tarea
Map<String, Integer> executionSums = new HashMap<>();  
System.out.println("executionSums" + executionSums);

// Map para almacenar el último valor reportado de ejecuciones acumuladas
Map<String, Integer> reportedUocViolations = new HashMap<>();

statementUoc.addListener((newData, oldData, stat, rt) -> {
    System.out.println("adios" );
    if (newData != null && newData.length > 0) {
        String parentId = (String) newData[0].get("parentId");
        String subTaskId = (String) newData[0].get("subTaskId");
        System.out.println("Parent ID: " + parentId + ", SubTask ID: " + subTaskId );
        
        // Obtener la lista de userTask y manejarla como List
        String userTask = (String) newData[0].get("userTask");

        // Número actual de ejecuciones reportadas para esta sub-tarea
        Integer currentExecutions = (Integer) newData[0].get("totalExecutions");
        // Número máximo permitido de ejecuciones (parent.mth)
        Integer maxTimes = (Integer) newData[0].get("parentMth");

        // Generar una clave única para identificar el sub-task
        String taskKey = parentId + "|" + subTaskId;

        // Acumular el número de ejecuciones en el mapa
        executionSums.put(taskKey, executionSums.getOrDefault(taskKey, 0) + currentExecutions);
        System.out.println("executionSums2" + executionSums);
        // Obtener el total acumulado
        int accumulatedExecutions = executionSums.get(taskKey);
        System.out.println("accumulatedExecutions" + accumulatedExecutions);
        
        // Verificar si el acumulado ya excede el máximo permitido
        if (accumulatedExecutions > maxTimes) {
            // Verificar si esta acumulación ya ha sido reportada
            if (!reportedUocViolations.containsKey(taskKey) || accumulatedExecutions > reportedUocViolations.get(taskKey)) {
                sb.append("\n---------------------------------");
                sb.append("\n- [UOC MONITOR] Usage of Control violation detected:");
                sb.append("\n- Parent Task ID: ").append(parentId);
                sb.append("\n- SubTask ID: ").append(subTaskId);
                sb.append("\n- User(s): ").append(userTask); 
                sb.append("\n- Total number of executions (accumulated): ").append(accumulatedExecutions);
                sb.append("\n- Maximum allowed: ").append(maxTimes != null ? maxTimes : "N/A");
                sb.append("\n---------------------------------");

                // Actualizar el mapa con el último nivel reportado de ejecuciones acumuladas
                reportedUocViolations.put(taskKey, accumulatedExecutions);
            }
        }
    }
});

        } catch (Exception e) {
            LOG.error("Error compiling or deploying EPL statements", e);
        }
    }

    // Declarar un mapa para almacenar tareas por startTime
    private Map<Long, List<Task>> taskGroups = new HashMap<>();
    private Set<Long> processedStartTimes = new HashSet<>(); // Para rastrear startTimes ya procesados

    public void handle(Task event) {
        Long startTime = event.getStartTime();
    
        // Aceptar también tareas con propiedades de seguridad activas aunque el startTime sea nulo
        if (startTime != null || event.isBodSecurity() || event.isSodSecurity() || event.isUocSecurity()) {
            taskGroups.computeIfAbsent(startTime != null ? startTime : -1L, k -> new ArrayList<>()).add(event);
        }
    
        // Revisar si es el momento de procesar el grupo (cuando se ha acumulado un grupo)
        processTaskGroups();
        LOG.info(sb.toString());
    }    

    private Long previousStartTime = null;

    private void processTaskGroups() {
        taskGroups.forEach((startTime, tasks) -> {
            if (previousStartTime == null || !startTime.equals(previousStartTime)) {
                if (startTime == -1L) {
                    LOG.info("Enviando tarea sin startTime");
                } else {
                    LOG.info("Enviando tarea con startTime: {}", startTime);
                }
                previousStartTime = startTime;
            }
    
            // Procesar todas las tareas del grupo, incluidas las tareas padres de seguridad
            tasks.forEach(task -> {
                LOG.info("Instance {}: {}", task.getInstance(), task);
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

    // Filtrar tareas con bodSecurity, uocSecurity, sodSecurity activos o startTime no nulo
    Map<Long, List<Task>> groupedTasks = tasks.stream()
        .filter(task -> task.getStartTime() != null || // Aceptar startTime no nulo
            (task.isBodSecurity() || task.isUocSecurity() || task.isSodSecurity())) // Aceptar tareas con seguridad activa aunque startTime sea nulo
        .collect(Collectors.groupingBy(task -> 
            task.getStartTime() != null ? task.getStartTime() : -1L, // Usar -1L para agrupar las tareas sin startTime
            TreeMap::new, Collectors.toList())); // Usar TreeMap para ordenar por startTime

    groupedTasks.forEach((startTime, taskList) -> {
        if (startTime == -1L) {
            LOG.info("Enviando tarea sin startTime");
        } else {
            LOG.info("Enviando tarea con startTime: {}", startTime);
        }

        taskList.forEach(task -> {
            LOG.info("Instance {}: {}", task.getInstance(), task);
            epRuntime.getEventService().sendEventBean(task, "Task");
            LOG.info("Sending task to Esper: {}", task);
            epRuntime.getEventService().sendEventBean(task, "Task");

        });

        tasks.forEach(task -> {
            LOG.info("Sending task with stopTime: {}", task.getStopTime());
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
            LOG.info("Violations have been written to " + filename);
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
