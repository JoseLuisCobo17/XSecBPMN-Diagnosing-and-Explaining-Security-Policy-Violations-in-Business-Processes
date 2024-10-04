package main.java.com.cor.cep.event;

import java.util.List;

public class UserTask {

    private String type;
    private String name;
    private String idBpmn;
    private Integer nu;
    private Integer mth;
    private List<String> subTasks;

    // Constructor
    public UserTask(String type, String name, String idBpmn, Integer nu, Integer mth, List<String> subTasks) {
        this.type = type;
        this.name = name;
        this.idBpmn = idBpmn;
        this.nu = nu;
        this.mth = mth;
        this.subTasks = subTasks;
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

    @Override
    public String toString() {
        return "UserTask [type=" + type + ", name=" + name + ", idBpmn=" + idBpmn + ", nu=" + nu 
            + ", mth=" + mth + ", subTasks=" + subTasks + "]";
    }
}
