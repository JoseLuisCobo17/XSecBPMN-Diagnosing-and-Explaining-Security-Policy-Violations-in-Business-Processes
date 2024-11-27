import subprocess
import os
from generateScript import generateScript
from generateSecurityScript import generateScript as generateSecurityScript
from models.parser import parse_bpmn_elements

rulesPath = 'files/esperTasks.txt'

with open(rulesPath, 'r') as f:
    file_content = f.read()
elements, process, starts, messageStarts, trackSecurity = parse_bpmn_elements(file_content)
if elements[process].security:
    script, process = generateSecurityScript(elements, process, starts, messageStarts, trackSecurity)
else:
    script, process = generateScript(elements, process, starts, messageStarts, trackSecurity)
script_name = f'script_{process}.py'
with open(script_name, 'w') as f:
    f.write(script)

subprocess.run(['python', script_name])
os.remove(rulesPath)
os.remove(script_name)

results_path = f'files/resultSimulation.txt'
log_dir = 'eventLogs'
os.makedirs(log_dir, exist_ok=True)
existing_logs = [f for f in os.listdir(log_dir) if f.startswith("scenario") and f.endswith(".log")]
if existing_logs:
    scenario_numbers = [int(log.replace("scenario", "").replace(".log", "")) for log in existing_logs]
    next_scenario = max(scenario_numbers) + 1
else:
    next_scenario = 1
new_log_file = f'{log_dir}/scenario{next_scenario}.log'
if os.path.exists(results_path):
    with open(results_path, 'r') as src, open(new_log_file, 'w') as dest:
        dest.write(src.read())