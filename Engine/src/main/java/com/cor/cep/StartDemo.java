package com.cor.cep;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.BeanFactory;
import org.springframework.context.support.ClassPathXmlApplicationContext;
import com.cor.cep.util.RandomTaskEventGenerator;
import com.cor.cep.util.TaskProcessor;

/**
 * Entry point for the Demo. Run this from your IDE, or from the command line using 'mvn exec:java'.
 */
public class StartDemo {

    private static final Logger LOG = LoggerFactory.getLogger(StartDemo.class);

    public static void main(String[] args) throws Exception {

        LOG.debug("Starting application...");

        long noOfTemperatureEvents = 1000;
        String mode = "random"; // default mode

        if (args.length >= 1) {
            mode = args[0].toLowerCase();
        }

        if (args.length >= 2) {
            try {
                noOfTemperatureEvents = Long.valueOf(args[1]);
                LOG.info("Number of events set to: {}", noOfTemperatureEvents);
            } catch (NumberFormatException e) {
                LOG.error("Invalid number format for events: {}. Using default value.", args[1], e);
            }
        } else {
            LOG.debug("No override of number of events detected - defaulting to {} events.", noOfTemperatureEvents);
        }

        // Load spring config
        LOG.info("Loading Spring application context...");
        ClassPathXmlApplicationContext appContext = new ClassPathXmlApplicationContext("application-context.xml");
        BeanFactory factory = appContext;

        if ("random".equals(mode)) {
            LOG.info("Starting event generator...");
            RandomTaskEventGenerator generator = (RandomTaskEventGenerator) factory.getBean("eventGenerator");
            generator.startSendingTaskReadings(noOfTemperatureEvents);
        } else if ("file".equals(mode)) {
            LOG.info("Processing task files...");
            TaskProcessor taskProcessor = (TaskProcessor) factory.getBean("taskProcessor");

            // Directorio que contiene los archivos .txt
            String directoryPath = "/home/jose_luis/Escritorio/Investigacion/ModelingSecurityEngine/Engine/src/main/java/com/cor/cep/files";
            taskProcessor.processTaskFiles(directoryPath);
        } else {
            LOG.error("Invalid mode specified. Use 'random' or 'file'.");
        }
    }
}
