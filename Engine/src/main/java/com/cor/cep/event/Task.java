package com.cor.cep.event;

import java.util.List;

public class Task {
    private String type;
    private String name;
    private String idBpmn;
    private Integer nu;
    private Integer mth;
    private List<String> subTasks;
    private List<String> userTasks;
    private boolean bodSecurity;
    private boolean sodSecurity;
    private boolean uocSecurity;
    private Long startTime; 
    private Long stopTime; // Nueva propiedad para el tiempo de parada
    private Long time; 
    private Integer instance; // Nueva propiedad para la instancia

    // Constructor
    public Task(String type, String name, String idBpmn, Integer nu, Integer mth, List<String> subTasks, List<String> userTasks, boolean bodSecurity, boolean sodSecurity, boolean uocSecurity, Long startTime, Long stopTime, Long time, Integer instance) {
        this.type = type;
        this.name = name;
        this.idBpmn = idBpmn;
        this.nu = nu;
        this.mth = mth;
        this.subTasks = subTasks;
        this.userTasks = userTasks;
        this.bodSecurity = bodSecurity;
        this.sodSecurity = sodSecurity;
        this.uocSecurity = uocSecurity;
        this.startTime = startTime; 
        this.stopTime = stopTime; // Inicializar la nueva propiedad
        this.time = time; 
        this.instance = instance; // Inicializar la nueva propiedad
    }

    // Getters y Setters
    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getIdBpmn() {
        return idBpmn;
    }

    public void setIdBpmn(String idBpmn) {
        this.idBpmn = idBpmn;
    }

    public Integer getNu() {
        return nu;
    }

    public void setNu(Integer nu) {
        this.nu = nu;
    }

    public Integer getMth() {
        return mth;
    }

    public void setMth(Integer mth) {
        this.mth = mth;
    }

    public List<String> getSubTasks() {
        return subTasks;
    }

    public void setSubTasks(List<String> subTasks) {
        this.subTasks = subTasks;
    }

    public List<String> getUserTasks() {
        return userTasks;
    }

    public void setUserTasks(List<String> userTasks) {
        this.userTasks = userTasks;
    }

    public boolean isBodSecurity() {
        return bodSecurity;
    }

    public void setBodSecurity(boolean bodSecurity) {
        this.bodSecurity = bodSecurity;
    }

    public boolean isSodSecurity() {
        return sodSecurity;
    }

    public void setSodSecurity(boolean sodSecurity) {
        this.sodSecurity = sodSecurity;
    }

    public boolean isUocSecurity() {
        return uocSecurity;
    }

    public void setUocSecurity(boolean uocSecurity) {
        this.uocSecurity = uocSecurity;
    }

    public Long getStartTime() {
        return startTime;
    }

    public void setStartTime(Long startTime) {
        this.startTime = startTime;
    }

    public Long getStopTime() {
        return stopTime;
    }

    public void setStopTime(Long stopTime) {
        this.stopTime = stopTime;
    }

    public Long getTime() {
        return time;
    }

    public void setTime(Long time) {
        this.time = time;
    }
    
    public Integer getInstance() {
        return instance;
    }

    public void setInstance(Integer instance) {
        this.instance = instance;
    }

    @Override
    public String toString() {
        return "Task [type=" + type + ", name=" + name + ", idBpmn=" + idBpmn + ", nu=" + nu 
            + ", mth=" + mth + ", subTasks=" + subTasks + ", userTasks=" + userTasks
            + ", bodSecurity=" + bodSecurity + ", sodSecurity=" + sodSecurity
            + ", uocSecurity=" + uocSecurity + ", startTime=" + startTime + ", stopTime=" + stopTime 
            + ", time=" + time + ", instance=" + instance + "]";
    }
}
