package com.cor.cep.event;

import java.util.List;

public class Task {

    private String type;
    private String name;
    private String idBpmn;
    private boolean sodSecurity;
    private boolean bodSecurity;
    private boolean uocSecurity;
    private long timestamp;
    private Integer nu;
    private Integer mth;
    private Integer p;
    private String user;
    private String log;
    private List<String> subTasks;  
    private List<String> userTasks; // Nueva propiedad para userTasks

    // Constructor con la nueva propiedad userTasks
    public Task(String type, String name, String idBpmn, boolean sodSecurity, boolean bodSecurity, boolean uocSecurity, 
                long timestamp, Integer nu, Integer mth, Integer p, String user, String log, List<String> subTasks, List<String> userTasks) {
        this.type = type;
        this.name = name;
        this.idBpmn = idBpmn;
        this.sodSecurity = sodSecurity;
        this.bodSecurity = bodSecurity;
        this.uocSecurity = uocSecurity;
        this.timestamp = timestamp;
        this.nu = nu;
        this.mth = mth;
        this.p = p;
        this.user = user;
        this.log = log;
        this.subTasks = subTasks;
        this.userTasks = userTasks;
    }

    // Getters y Setters para la nueva propiedad userTasks

    public List<String> getUserTasks() {
        return userTasks;
    }

    public void setUserTasks(List<String> userTasks) {
        this.userTasks = userTasks;
    }

    // Getters y Setters existentes

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

    public boolean isSodSecurity() {
        return sodSecurity;
    }

    public void setSodSecurity(boolean sodSecurity) {
        this.sodSecurity = sodSecurity;
    }

    public boolean isBodSecurity() {
        return bodSecurity;
    }

    public void setBodSecurity(boolean bodSecurity) {
        this.bodSecurity = bodSecurity;
    }

    public boolean isUocSecurity() {
        return uocSecurity;
    }

    public void setUocSecurity(boolean uocSecurity) {
        this.uocSecurity = uocSecurity;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
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

    public Integer getP() {
        return p;
    }

    public void setP(Integer p) {
        this.p = p;
    }

    public String getUser() {
        return user;
    }

    public void setUser(String user) {
        this.user = user;
    }

    public String getLog() {
        return log;
    }

    public void setLog(String log) {
        this.log = log;
    }

    public List<String> getSubTasks() {
        return subTasks;
    }

    public void setSubTasks(List<String> subTasks) {
        this.subTasks = subTasks;
    }

    @Override
    public String toString() {
        return "Task [type=" + type + ", name=" + name + ", idBpmn=" + idBpmn + ", sodSecurity=" + sodSecurity 
            + ", bodSecurity=" + bodSecurity + ", uocSecurity=" + uocSecurity + ", timestamp=" + timestamp 
            + ", nu=" + nu + ", mth=" + mth + ", p=" + p + ", user=" + user + ", log=" + log 
            + ", subTasks=" + subTasks + ", userTasks=" + userTasks + "]";
    }
}
