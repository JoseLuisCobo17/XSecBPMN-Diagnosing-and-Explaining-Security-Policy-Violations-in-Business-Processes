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
import java.util.HashSet;
import java.util.Set;

@Component
@Scope(value = "singleton")
public class TaskEventHandler implements InitializingBean {

    private static final Logger LOG = LoggerFactory.getLogger(TaskEventHandler.class);
    private EPRuntime epRuntime;

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
                    LOG.info("Processing file: " + file.getName());
                    listaStrings.addAll(obtenerUserTasksDesdeArchivo(file.getAbsolutePath()));
                }
            }
        } else {
            LOG.error("No files found in the current working directory: " + currentDir.getAbsolutePath());
            return; 
        }

        try {
            EPCompiler compiler = EPCompilerProvider.getCompiler();
            CompilerArguments args = new CompilerArguments(configuration);

            // BoD rules 
            LOG.debug("Creating Generalized BoD Check Expression");

            String bodEPL = "select parent.idBpmn as parentId, " +
                "sub1.idBpmn as subTask1Id, sub2.idBpmn as subTask2Id, " +
                "sub1.user as user1, sub2.user as user2 " +
                "from Task#keepall as parent, Task#keepall as sub1, Task#keepall as sub2 " +
                "where parent.bodSecurity = true " +              // Parent task has BoD enabled
                "and sub1.user is not null and sub2.user is not null " + // Ensure both users are not null
                "and sub1.user = sub2.user " +                    // Same user for both sub-tasks
                "and sub1.idBpmn != sub2.idBpmn " +               // Different sub-tasks
                "and sub1.idBpmn in (parent.subTasks) " +         // sub1 is a sub-task of parent
                "and sub2.idBpmn in (parent.subTasks) ";          // sub2 is a sub-task of parent


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

            // Debug log for BoD checks
            LOG.debug("New data received for BoD check: Parent Task ID = {}, SubTask 1 ID = {}, SubTask 2 ID = {}, User1 = {}, User2 = {}", 
                  parentId, subTask1Id, subTask2Id, user1, user2);

            LOG.info("Checking BoD for Parent Task: {}", parentId);
            LOG.info("SubTask 1: {} (User: {})", subTask1Id, user1);
            LOG.info("SubTask 2: {} (User: {})", subTask2Id, user2);

            if (user1 != null && user1.equals(user2)) {
                StringBuilder sb = new StringBuilder();
                sb.append("---------------------------------");
                sb.append("\n- [BOD MONITOR] Binding of Duties detected:");
                sb.append("\n- Parent Task ID: ").append(parentId);
                sb.append("\n- SubTask 1 ID: ").append(subTask1Id);
                sb.append("\n- SubTask 2 ID: ").append(subTask2Id);
                sb.append("\n- User ID: ").append(user1);
                sb.append("\n---------------------------------");

                LOG.info(sb.toString());
            } else {
                LOG.info("No BoD violation: Users differ or are empty.");
            }
        }
    });

            // SoD rules
            LOG.debug("Creating Generalized SoD Check Expression");
            String sodEPL = "select parent.idBpmn as parentId, " +
                            "sub1.idBpmn as subTask1Id, sub2.idBpmn as subTask2Id, " +
                            "sub1.user as user1, sub2.user as user2, " +
                            "parent.nu as nuValue, " +
                            "count(distinct sub1.user) as distinctUserCount " +
                            "from Task#keepall as parent, Task#keepall as sub1, Task#keepall as sub2 " +
                            "where parent.sodSecurity = true " +              // Parent task has SoD enabled
                            "and sub1.user = sub2.user " +                    // Same user for different sub-tasks
                            "and sub1.idBpmn != sub2.idBpmn " +               // Different sub-tasks
                            "and sub1.idBpmn in (parent.subTasks) " +         // sub1 is a sub-task of parent
                            "and sub2.idBpmn in (parent.subTasks) " +         // sub2 is a sub-task of parent
                            "group by parent.idBpmn, sub1.idBpmn, sub2.idBpmn, sub1.user, sub2.user, parent.nu " +
                            "having count(distinct sub1.user) < parent.nu";   // Check if 'nu' is greater than distinct user count

            EPCompiled compiledSod = compiler.compile(sodEPL, args);
            EPDeployment deploymentSod = epRuntime.getDeploymentService().deploy(compiledSod);
            EPStatement statementSod = deploymentSod.getStatements()[0];
            statementSod.addListener((newData, oldData, stat, rt) -> {
                if (newData != null && newData.length > 0) {
                    String parentId = (String) newData[0].get("parentId");
                    String subTask1Id = (String) newData[0].get("subTask1Id");
                    String subTask2Id = (String) newData[0].get("subTask2Id");
                    String user1 = (String) newData[0].get("user1");
                    String user2 = (String) newData[0].get("user2");
                    Integer nuValue = (Integer) newData[0].get("nuValue");
                    Long distinctUserCount = (Long) newData[0].get("distinctUserCount");

                    LOG.info("Comparing SubTasks: {} (User: {}) and {} (User: {}) under Parent Task: {} with NU: {} and Distinct Users: {}",
                            subTask1Id, user1, subTask2Id, user2, parentId, nuValue, distinctUserCount);

                    if (user1.equals(user2) || nuValue > distinctUserCount) {
                        StringBuilder sb = new StringBuilder();
                        sb.append("---------------------------------");
                        sb.append("\n- [SOD MONITOR] Segregation of Duties enforced:");
                        sb.append("\n- Parent Task ID: ").append(parentId);
                        sb.append("\n- SubTask 1 ID: ").append(subTask1Id);
                        sb.append("\n- SubTask 2 ID: ").append(subTask2Id);
                        sb.append("\n- User 1 ID: ").append(user1);
                        sb.append("\n- User 2 ID: ").append(user2);
                        sb.append("\n- NU Value: ").append(nuValue);
                        sb.append("\n- Distinct User Count: ").append(distinctUserCount);
                        sb.append("\n---------------------------------");

                        LOG.info(sb.toString());
                    }
                }
            });

            // UoC rules
            LOG.debug("Creating UoC Check Expression");
            String uocEPL = "select user as userId, count(*) as taskCount " +
                            "from Task#time(1 min) " +
                            "where uocSecurity = true and mth >= 4 ";
            EPCompiled compiledUoc = compiler.compile(uocEPL, args);
            EPDeployment deploymentUoc = epRuntime.getDeploymentService().deploy(compiledUoc);
            EPStatement statementUoc = deploymentUoc.getStatements()[0];
            statementUoc.addListener((newData, oldData, stat, rt) -> {
                String userId = (String) newData[0].get("userId");
                Long taskCount = (Long) newData[0].get("taskCount");

                StringBuilder sb = new StringBuilder();
                sb.append("---------------------------------");
                sb.append("\n- [UOC MONITOR] Usage of Control violation detected:");
                sb.append("\n- User ID: ").append(userId);
                sb.append("\n- Number of executions: ").append(taskCount);
                sb.append("\n---------------------------------");

                LOG.info(sb.toString());
            });

            // Monitor all tasks
            LOG.debug("Creating Monitor Expression");
            String monitorEPL = "select * from Task";
            EPCompiled compiledMonitor = compiler.compile(monitorEPL, args);
            EPDeployment deploymentMonitor = epRuntime.getDeploymentService().deploy(compiledMonitor);
            EPStatement statementMonitor = deploymentMonitor.getStatements()[0];
            statementMonitor.addListener((newData, oldData, stat, rt) -> {
                Task task = (Task) newData[0].getUnderlying();
                LOG.info("Task: " + task);
                try {
                    Thread.sleep(3000);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    LOG.error("Thread was interrupted", e);
                }
            });

        } catch (Exception e) {
            LOG.error("Error compiling or deploying EPL statements", e);
        }
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

    public void handle(Task event) {
        LOG.debug(event.toString());
        epRuntime.getEventService().sendEventBean(event, "Task");
    }

    @Override
    public void afterPropertiesSet() {
        LOG.debug("Configuring..");
        initService();
    }
}
