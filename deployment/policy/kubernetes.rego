# Policy-as-code for rendered Kubernetes manifests. Run by CI:
#   helm template aiml deployment/helm/ai-solution -f deployment/helm/ai-solution/values-prod.yaml | conftest test --policy deployment/policy -
package main

import rego.v1

workloads := {"Deployment", "StatefulSet", "DaemonSet"}

deny contains msg if {
	input.kind in workloads
	not input.spec.template.spec.securityContext.runAsNonRoot
	msg := sprintf("%s/%s: pod must set securityContext.runAsNonRoot=true", [input.kind, input.metadata.name])
}

deny contains msg if {
	input.kind in workloads
	some c in input.spec.template.spec.containers
	not c.securityContext.readOnlyRootFilesystem
	msg := sprintf("%s/%s: container %s must set readOnlyRootFilesystem=true", [input.kind, input.metadata.name, c.name])
}

deny contains msg if {
	input.kind in workloads
	some c in input.spec.template.spec.containers
	c.securityContext.allowPrivilegeEscalation != false
	msg := sprintf("%s/%s: container %s must set allowPrivilegeEscalation=false", [input.kind, input.metadata.name, c.name])
}

deny contains msg if {
	input.kind in workloads
	some c in input.spec.template.spec.containers
	not c.resources.limits.memory
	msg := sprintf("%s/%s: container %s must set a memory limit", [input.kind, input.metadata.name, c.name])
}

deny contains msg if {
	input.kind in workloads
	some c in input.spec.template.spec.containers
	endswith(c.image, ":latest")
	msg := sprintf("%s/%s: container %s uses the mutable :latest tag", [input.kind, input.metadata.name, c.name])
}

deny contains msg if {
	input.kind in workloads
	some c in input.spec.template.spec.containers
	not contains(c.image, ":")
	msg := sprintf("%s/%s: container %s image has no tag or digest", [input.kind, input.metadata.name, c.name])
}

deny contains msg if {
	input.kind in workloads
	input.spec.template.spec.hostNetwork == true
	msg := sprintf("%s/%s: hostNetwork is not allowed", [input.kind, input.metadata.name])
}
