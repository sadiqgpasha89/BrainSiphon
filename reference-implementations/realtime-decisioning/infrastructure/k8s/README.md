# Kubernetes manifests

`kubectl apply -k infrastructure/k8s` deploys the API (2 replicas, autoscaled), the worker and two CronJobs (monitoring every
5 minutes, retraining check nightly) into the `realtime-decisioning` namespace.

Before applying:

1. Build and push the image (`infrastructure/Dockerfile`) and set it in `kustomization.yaml` (`images:`).
2. Create the secret from your real values. Do not commit it:
   `kubectl -n realtime-decisioning create secret generic app-secrets --from-env-file=.env.production`
   (`secret.example.yaml` lists the keys it must contain).
3. Provide PostgreSQL (`DATABASE_URL`) and a ReadWriteMany volume or object-store mount for the model registry
   (`registry-pvc.yaml` asks for RWX; on a cluster without RWX, mount object storage instead).

The cluster, database and networking themselves are provisioned by the Terraform modules and Helm chart in the repository's
`deployment/` directory. These manifests were validated for syntax only (`kubectl kustomize`); they have not been applied to a
cluster as part of this repository's CI.
