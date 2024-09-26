package com.cor.cep.util;

import java.util.Arrays;
import java.util.List;
import java.util.Random;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.cor.cep.event.Task;
import com.cor.cep.handler.TaskEventHandler;

/**
 * Just a simple class to create a number of Random Tasks and pass them off to the
 * TaskEventHandler.
 */
@Component
public class RandomTaskEventGenerator {

    /** Logger */
    private static Logger LOG = LoggerFactory.getLogger(RandomTaskEventGenerator.class);

    /** The TaskEventHandler - wraps the Esper engine and processes the Events  */
    @Autowired
    private TaskEventHandler taskEventHandler;

    /** Counter for generating sequential task IDs */
    private AtomicInteger taskIdCounter = new AtomicInteger(1);

    /** Keeps track of the last userId to increase rule trigger frequency */
    private String lastUserId = null;

    /** Random instance for generating random values */
    private Random random = new Random();

    /**
     * Function to generate a userId with a higher probability of reusing the same userId.
     * This is aimed at triggering Usage of Control (UoC) rules.
     */
    private String generateUserIdUocRules(boolean uocSecurity) {
        if (uocSecurity && (lastUserId != null && random.nextDouble() < 0.9)) {
            return lastUserId;
        } else {
            lastUserId = "user" + random.nextInt(10);
            return lastUserId;
        }
    }

    /**
     * Function to determine the userId with a higher probability of using the last used userId.
     */
    private String generateUserIdBodRules(boolean bodSecurity) {
        if (bodSecurity && (lastUserId == null || random.nextDouble() < 0.7)) {
            lastUserId = "user" + random.nextInt(10);
        }
        return lastUserId;
    }

    /**
     * Function to generate a userId with a higher probability of using a different userId.
     * This is aimed at triggering Segregation of Duties (SoD) rules.
     */
    private String generateUserIdSodRules(boolean sodSecurity) {
        if (sodSecurity) {
            if (lastUserId == null || random.nextDouble() < 0.95) {  
                String newUserId;
                do {
                    newUserId = "user" + random.nextInt(10);
                } while (newUserId.equals(lastUserId));
                lastUserId = newUserId;
            }
        } else {
            if (random.nextDouble() < 0.7) {  
                lastUserId = "user" + random.nextInt(10);
            }
        }
        return lastUserId;
    }

    /**
     * Creates simple random Task events and lets the implementation class handle them.
     */
    public void startSendingTaskReadings(final long noOfTaskEvents) {

        ExecutorService taskExecutor = Executors.newSingleThreadExecutor();

        taskExecutor.submit(new Runnable() {
            public void run() {

                LOG.debug(getStartingMessage());

                int count = 0;
                while (count < noOfTaskEvents) {

                    boolean bodSecurity = random.nextBoolean();
                    boolean sodSecurity = random.nextBoolean();
                    boolean uocSecurity = random.nextBoolean();

                    String userId = generateUserIdBodRules(bodSecurity);
                    String taskId = "task" + taskIdCounter.getAndIncrement();

                    // Generate random values for the new fields in Task
                    String type = "bpmn:" + generateRandomTaskType();
                    String name = "TaskName" + random.nextInt(10);
                    String idBpmn = "Activity_" + random.nextInt(10000);

                    long timestamp = System.currentTimeMillis();
                    Integer nu = random.nextInt(6);
                    Integer mth = random.nextInt(6);
                    Integer p = random.nextInt(6);
                    String log = "log entry " + random.nextInt(100);
                    List<String> subTasks = Arrays.asList("subtask" + random.nextInt(10));

                    Task task = new Task(type, name, idBpmn, sodSecurity, bodSecurity, uocSecurity, 
                                         timestamp, nu, mth, p, userId, log, subTasks);
                    taskEventHandler.handle(task);

                    count++;

                    try {
                        Thread.sleep(100); 
                    } catch (InterruptedException e) {
                        LOG.error("Thread Interrupted", e);
                    }
                }
            }
        });
    }

    private String generateRandomTaskType() {
        String[] taskTypes = {"Process", "StartEvent", "Task", "ServiceTask", "ExclusiveGateway", "EndEvent", "SequenceFlow"};
        return taskTypes[random.nextInt(taskTypes.length)];
    }

    private String getStartingMessage() {
        StringBuilder sb = new StringBuilder();
        sb.append("\n\n************************************************************");
        sb.append("\n* STARTING -");
        sb.append("\n* PLEASE WAIT - TASKS ARE RANDOM SO MAY TAKE");
        sb.append("\n* A WHILE TO SEE ALL EVENTS!");
        sb.append("\n************************************************************");
        return sb.toString();
    }
}
