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
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Component
@Scope(value = "singleton")
public class TaskEventHandler implements InitializingBean {

    private static final Logger LOG = LoggerFactory.getLogger(TaskEventHandler.class);
    private EPRuntime epRuntime;

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
                    listaStrings.addAll(obtenerUserTasksDesdeArchivo(file.getAbsolutePath()));
                }
            }
        } else {
            LOG.error("No files found in the current working directory: " + currentDir.getAbsolutePath());
            return; 
        }

        try {
            List<Task> tasks = obtenerListaDeTareas();
            EPCompiler compiler = EPCompilerProvider.getCompiler();
            CompilerArguments args = new CompilerArguments(configuration);
              
            // Crear la consulta EPL para BoD
            LOG.debug("Creating Generalized BoD Check Expression");
            String bodEPL = "select parent.idBpmn as parentId, " +
                "sub1.idBpmn as subTask1Id, sub2.idBpmn as subTask2Id, " +
                "sub1.userTasks as userTasks1, sub2.userTasks as userTasks2, " +
                "sub1.instance as instance1, sub2.instance as instance2 " +
                "from Task#keepall as parent, Task#keepall as sub1, Task#keepall as sub2 " +
                "where parent.bodSecurity = true " +  // Parent task has BoD enabled
                "and sub1.idBpmn != sub2.idBpmn " +  // Different sub-tasks
                "and sub1.idBpmn in (parent.subTasks) " +  // sub1 is a sub-task of parent
                "and sub2.idBpmn in (parent.subTasks) " +  // sub2 is a sub-task of parent
                "and sub1.userTasks is not null " +  // Ensure userTasks is not null for sub1
                "and sub2.userTasks is not null " +  // Ensure userTasks is not null for sub2
                "and sub1.instance = sub2.instance";  // Ensure sub-tasks are in the same instance

            EPCompiled compiledBod = compiler.compile(bodEPL, args);
            EPDeployment deploymentBod = epRuntime.getDeploymentService().deploy(compiledBod);
            EPStatement statementBod = deploymentBod.getStatements()[0];
            statementBod.addListener((newData, oldData, stat, rt) -> {
            if (newData != null && newData.length > 0) {
                String parentId = (String) newData[0].get("parentId");
                String subTask1Id = (String) newData[0].get("subTask1Id");
                String subTask2Id = (String) newData[0].get("subTask2Id");
                List<String> userTasks1 = (List<String>) newData[0].get("userTasks1");
                List<String> userTasks2 = (List<String>) newData[0].get("userTasks2");
                Integer instance1 = (Integer) newData[0].get("instance1");
                Integer instance2 = (Integer) newData[0].get("instance2");

            // Debug log for BoD checks
            LOG.debug("New data received for BoD check: Parent Task ID = {}, SubTask 1 ID = {}, SubTask 2 ID = {}, UserTasks1 = {}, UserTasks2 = {}, Instance1 = {}, Instance2 = {}", 
              parentId, subTask1Id, subTask2Id, userTasks1, userTasks2, instance1, instance2);

            LOG.info("Checking BoD for Parent Task: {}", parentId);
            LOG.info("SubTask 1: {} (Users: {}, Instance: {})", subTask1Id, userTasks1, instance1);
            LOG.info("SubTask 2: {} (Users: {}, Instance: {})", subTask2Id, userTasks2, instance2);

            if (userTasks1 != null && userTasks2 != null && !Collections.disjoint(userTasks1, userTasks2)) {
                StringBuilder sb = new StringBuilder();
                sb.append("---------------------------------");
                sb.append("\n- [BOD MONITOR] Binding of Duties detected:");
                sb.append("\n- Parent Task ID: ").append(parentId);
                sb.append("\n- SubTask 1 ID: ").append(subTask1Id);
                sb.append("\n- SubTask 2 ID: ").append(subTask2Id);
                sb.append("\n- Instance: ").append(instance1);
                sb.append("\n- Common Users: ").append(userTasks1.stream().filter(userTasks2::contains).collect(Collectors.toList()));
                sb.append("\n---------------------------------");

                LOG.info(sb.toString());
            } else {
                LOG.info("No BoD violation: Users differ or are empty.");
            }
        }
    });

            for (int i = 0; i < tasks.size(); i++) {
                Task sub1 = tasks.get(i);

                for (int j = i + 1; j < tasks.size(); j++) {
                    Task sub2 = tasks.get(j);

                    // Comprobar intersección entre userTasks de sub1 y sub2
                    boolean hasIntersection = !Collections.disjoint(sub1.getUserTasks(), sub2.getUserTasks());

                    if (hasIntersection) {
                        // Lógica para manejar la intersección y enviar eventos
                        epRuntime.getEventService().sendEventBean(sub1, "Task");
                        epRuntime.getEventService().sendEventBean(sub2, "Task");
                    }
                }
            }

// Crear la consulta EPL para SoD
LOG.debug("Creating Generalized SoD Check Expression");
String sodEPL = "select parent.idBpmn as parentId, " +
                "sub1.idBpmn as subTask1Id, sub2.idBpmn as subTask2Id, " +
                "sub1.userTasks as userTasks1, sub2.userTasks as userTasks2, " +
                "parent.nu as nuValue, sub1.instance as instance1, sub2.instance as instance2 " +
                "from Task#keepall as parent, Task#keepall as sub1, Task#keepall as sub2 " +
                "where parent.sodSecurity = true " +  // Parent task has SoD enabled
                "and sub1.idBpmn != sub2.idBpmn " +  // Different sub-tasks
                "and sub1.idBpmn in (parent.subTasks) " +  // sub1 is a sub-task of parent
                "and sub2.idBpmn in (parent.subTasks) " +  // sub2 is a sub-task of parent
                "and sub1.instance = sub2.instance " +  // Ensure sub-tasks are in the same instance
                "and sub1.userTasks is not null " +  // Ensure userTasks is not null for sub1
                "and sub2.userTasks is not null " +  // Ensure userTasks is not null for sub2
                "group by parent.idBpmn, sub1.idBpmn, sub2.idBpmn, parent.nu, sub1.userTasks, sub2.userTasks, sub1.instance, sub2.instance " +
                "having count(distinct sub1.userTasks) >= parent.nu";  // Ensure minimum number of different users

EPCompiled compiledSod = compiler.compile(sodEPL, args);
EPDeployment deploymentSod = epRuntime.getDeploymentService().deploy(compiledSod);
EPStatement statementSod = deploymentSod.getStatements()[0];
statementSod.addListener((newData, oldData, stat, rt) -> {
    if (newData != null && newData.length > 0) {
        String parentId = (String) newData[0].get("parentId");
        String subTask1Id = (String) newData[0].get("subTask1Id");
        String subTask2Id = (String) newData[0].get("subTask2Id");
        List<String> userTasks1 = (List<String>) newData[0].get("userTasks1");
        List<String> userTasks2 = (List<String>) newData[0].get("userTasks2");
        Integer nuValue = (Integer) newData[0].get("nuValue");
        Integer instance1 = (Integer) newData[0].get("instance1");
        Integer instance2 = (Integer) newData[0].get("instance2");

        // Debug log for SoD checks
        LOG.debug("New data received for SoD check: Parent Task ID = {}, SubTask 1 ID = {}, SubTask 2 ID = {}, UserTasks1 = {}, UserTasks2 = {}, Instance1 = {}, Instance2 = {}", 
              parentId, subTask1Id, subTask2Id, userTasks1, userTasks2, instance1, instance2);

        LOG.info("Checking SoD for Parent Task: {}", parentId);
        LOG.info("SubTask 1: {} (Users: {}, Instance: {})", subTask1Id, userTasks1, instance1);
        LOG.info("SubTask 2: {} (Users: {}, Instance: {})", subTask2Id, userTasks2, instance2);

        if (userTasks1 != null && userTasks2 != null && Collections.disjoint(userTasks1, userTasks2)) {
            StringBuilder sb = new StringBuilder();
            sb.append("---------------------------------");
            sb.append("\n- [SOD MONITOR] Segregation of Duties enforced:");
            sb.append("\n- Parent Task ID: ").append(parentId);
            sb.append("\n- SubTask 1 ID: ").append(subTask1Id);
            sb.append("\n- SubTask 2 ID: ").append(subTask2Id);
            sb.append("\n- Instance: ").append(instance1);
            sb.append("\n---------------------------------");

            LOG.info(sb.toString());
        } else {
            LOG.info("No SoD violation: Users overlap or are empty.");
        }
    }
});

// Crear la consulta EPL para UoC
LOG.debug("Creating UoC Check Expression");

String uocEPL = "select parent.idBpmn as parentId, " +
                "parent.uocSecurity as uocSecurityEnabled, " +
                "subTask.idBpmn as subTaskId, " +
                "subTask.userTasks as userTasksList, " +
                "collect(subTask.instance) as instanceList, " +  // Recoger todas las instancias
                "count(distinct subTask.instance) as taskCount, " +  // Contar instancias distintas
                "parent.mth as maxTimes, " +
                "parent.nu as numUsers, " +
                "parent.x as roleOrUser " +
                "from Task#keepall as parent, Task#keepall as subTask " +  // Ventana indefinida para mantener todas las tareas
                "where parent.uocSecurity = true " +  // uocSecurity activado en la tarea padre
                "and subTask.idBpmn in (parent.subTasks) " +  // Subtareas del padre
                "and subTask.userTasks is not null " +  // Verificar que userTasks no sea null para subTask
                "and parent.x in subTask.userTasks " +  // Verificar si el usuario o rol está en la lista de userTasks
                "group by parent.idBpmn, subTask.userTasks " +
                "having count(distinct subTask.instance) > parent.mth";  // Verificar si el número de instancias distintas excede el máximo permitido

EPCompiled compiledUoc = compiler.compile(uocEPL, args);
EPDeployment deploymentUoc = epRuntime.getDeploymentService().deploy(compiledUoc);
EPStatement statementUoc = deploymentUoc.getStatements()[0];

statementUoc.addListener((newData, oldData, stat, rt) -> {
    if (newData != null && newData.length > 0) {
        String parentId = (String) newData[0].get("parentId");
        String subTaskId = (String) newData[0].get("subTaskId");
        List<String> userTasksList = (List<String>) newData[0].get("userTasksList");
        List<Integer> instanceList = (List<Integer>) newData[0].get("instanceList");
        Long taskCount = (Long) newData[0].get("taskCount");
        Integer maxTimes = (Integer) newData[0].get("maxTimes");

        StringBuilder sb = new StringBuilder();
        sb.append("---------------------------------");
        sb.append("\n- [UOC MONITOR] Usage of Control violation detected:");
        sb.append("\n- Parent Task ID: ").append(parentId);
        sb.append("\n- SubTask ID: ").append(subTaskId);
        sb.append("\n- Users: ").append(userTasksList);  // Mostrar la lista de usuarios
        sb.append("\n- Number of executions: ").append(taskCount);
        sb.append("\n- Maximum allowed: ").append(maxTimes);
        sb.append("\n- Instances: ").append(instanceList);  // Mostrar la lista de instancias
        sb.append("\n---------------------------------");

        LOG.info(sb.toString());
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
        });
    });
}

    private List<Task> obtenerListaDeTareas() {
        return new ArrayList<>(); 
    }

    private Set<String> obtenerUserTasksDesdeArchivo(String rutaArchivo) {
        Set<String> userTasks = new HashSet<>();
        try (BufferedReader br = new BufferedReader(new FileReader(rutaArchivo))) {
            String linea;
            while ((linea = br.readLine()) != null) {
                if (linea.contains("userTask=")) {
                    String[] partes = linea.split("userTask=");
                    if (partes.length > 1) {
                        String userTaskValue = partes[1].split(",")[0].trim(); 
                        userTasks.add(userTaskValue); 
                    }
                }
            }
        } catch (IOException e) {
            LOG.error("Error reading file: " + rutaArchivo, e);
        }
        return userTasks;
    }
    
    @Override
    public void afterPropertiesSet() {
        LOG.debug("Configuring..");
        initService();
    }
}
