from openai import OpenAI

client = OpenAI(
    base_url="DESIRED_BASE_URL",
    api_key="YOUR_API_KEY"
)

simulationPath = r"../path/to/resultSimulation.txt"
violationPath = r"../path/to/violations.txt"
diagnosisPath = r"../path/to/diagnosis.txt"
diagramPath = r"../path/to/diagram.bpmn"

with open(simulationPath, "r") as f:
    simulationContent = f.read()

with open(violationPath, "r") as f:
    violationContent = f.read()

with open(diagramPath, "r") as f:
    diagramContent = f.read()

example_diagnosis = """
**Example of Correct Diagnosis:**

**SOD Violation:**
- **Parent Task:** "Unnamed" (Activity_0oz806n)
- **Child Tasks:** "Evaluate refund plan" (Activity_03brord) and "Decide external auditing" (Activity_03d8opo)
- **User Assigned:** "ecofinantial1"

**Reason for Occurrence:**
Only user "ecofinantial1" was available at the start of task "Decide external auditing" (Activity_03d8opo) due to scheduling constraints.

**Suggested Fix:**
- Modify both tasks so that they are not adjacent, if possible.
- Increase the user resources for the Ecofinantial lane.
"""

prompt = f"""
### **Task: Analyze BPMN Simulation Violations**

**Input Sections:**

1. **Violation Instances:**
{violationContent}

2. **Simulation Log:**
{simulationContent}

3. **Optional BPMN File or Details:**
{diagramContent}

**Analysis Instructions:**

For each violation instance, follow these structures:

---

**[Violation Type (BoD, UoC, SoD)]:**
- **Parent Task:** [Parent Task Name and ID]
- **Child Tasks:** [Child Task Names and IDs]
- **User Assigned:** [User Name]

**Reason for Occurrence:**
Detail the exact cause of the violation using simulation log data or BPMN task dependencies.
Cite task times, user availability, and role conflicts as applicable.

**Suggested Fix:**
Provide targeted recommendations to resolve the issue:
- **Ensure sufficient user resources.**
- **Adjust task frequency or sequencing.**
- **Enforce or relax constraints as needed.**
Use specific examples where applicable.

---

**Additional Notes:**
- Reference the **BPMN file** or process diagram explicitly if provided.
- Mention any assumptions made due to missing data.
- Keep each analysis independent, without referencing other instances.

---

**Example Diagnosis:**

{example_diagnosis}
"""
completion = client.chat.completions.create(
    model="meta/llama-3.1-405b-instruct",
    messages=[{"role": "user", "content": prompt}],
    temperature=0.2,
    top_p=0.7,
    max_tokens=8192,
    stream=True
)

with open(diagnosisPath, "w") as f:
    for chunk in completion:
        if chunk.choices[0].delta.content is not None:
            f.write(chunk.choices[0].delta.content)
