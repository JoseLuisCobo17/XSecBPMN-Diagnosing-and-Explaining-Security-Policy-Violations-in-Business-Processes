package main.java.com.cor.cep.event;

public class SequenceFlow {

    private String type;
    private String name;
    private String idBpmn;
    private String superElement;
    private String subElement;

    // Constructor
    public SequenceFlow(String type, String name, String idBpmn, String superElement, String subElement) {
        this.type = type;
        this.name = name;
        this.idBpmn = idBpmn;
        this.superElement = superElement;
        this.subElement = subElement;
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

    public String getSuperElement() {
        return superElement;
    }

    public void setSuperElement(String superElement) {
        this.superElement = superElement;
    }

    public String getSubElement() {
        return subElement;
    }

    public void setSubElement(String subElement) {
        this.subElement = subElement;
    }

    @Override
    public String toString() {
        return "SequenceFlow [type=" + type + ", name=" + name + ", idBpmn=" + idBpmn + ", superElement=" + superElement 
            + ", subElement=" + subElement + "]";
    }
}
