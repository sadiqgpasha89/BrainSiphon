package main

import rego.v1

good := {"kind": "Deployment", "metadata": {"name": "x"}, "spec": {"template": {"spec": {
	"securityContext": {"runAsNonRoot": true},
	"containers": [{"name": "c", "image": "repo/x:1.0.0", "securityContext": {"readOnlyRootFilesystem": true, "allowPrivilegeEscalation": false}, "resources": {"limits": {"memory": "1Gi"}}}],
}}}}

test_good_passes if count(deny) == 0 with input as good

test_latest_denied if {
	bad := json.patch(good, [{"op": "replace", "path": "/spec/template/spec/containers/0/image", "value": "repo/x:latest"}])
	count(deny) > 0 with input as bad
}

test_root_denied if {
	bad := json.patch(good, [{"op": "replace", "path": "/spec/template/spec/securityContext/runAsNonRoot", "value": false}])
	count(deny) > 0 with input as bad
}
