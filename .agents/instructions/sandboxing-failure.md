# Sandboxing Failure Handling

> **Applies to:** Command execution failures caused by nested sandboxing in a devcontainer.

* The devcontainer is the primary security boundary.
* Do not weaken devcontainer security settings, such as seccomp, AppArmor, capabilities, or privileged mode, solely to make an agent's nested sandbox work.
* If command execution fails because the agent cannot create its sandbox inside the devcontainer:
  1. Retry without the agent's nested sandbox, if supported.
  2. Otherwise, report the incompatibility and instruct the user to disable the agent's sandboxing.
* Do not investigate or modify the devcontainer's security configuration unless the task explicitly concerns the devcontainer security policy itself.
