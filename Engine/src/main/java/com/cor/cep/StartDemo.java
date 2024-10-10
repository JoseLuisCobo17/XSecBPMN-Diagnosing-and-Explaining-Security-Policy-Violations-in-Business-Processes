package com.cor.cep;

import java.io.File;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.BeanFactory;
import org.springframework.context.support.ClassPathXmlApplicationContext;
import com.cor.cep.util.TaskProcessor;

/**
 * Entry point for the Demo. Run this from your IDE, or from the command line using 'mvn exec:java'.
 */
public class StartDemo {

    private static final Logger LOG = LoggerFactory.getLogger(StartDemo.class);

    public static void main(String[] args) throws Exception {

        LOG.debug("Starting application...");

        long noOfTemperatureEvents = 1000;
        String mode = "file"; // Default to "file" mode as "random" is no longer supported

        if (args.length >= 1) {
            LOG.info("Argumento recibido para mode: '{}'", args[0].trim()); // Usar trim() para eliminar espacios adicionales
            mode = args[0].trim().toLowerCase();
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

        // Always process task files as "random" mode is not supported
        LOG.info("Processing task files...");
        TaskProcessor taskProcessor = (TaskProcessor) factory.getBean("taskProcessor");

        String directoryPath = "../Simulator/files/";
        File directory = new File(directoryPath);

        // Obtener la ruta canónica
        String canonicalPath = directory.getCanonicalPath();

        // Imprimir la ruta canónica
        System.out.println("Ruta canónica: " + canonicalPath);
        taskProcessor.processTaskFiles(directoryPath);
    }
}
