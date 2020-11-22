#$/bin/bash

# General
export DESTINATION_DIRECTORY="../data/example_ocp/"

# create folders if needed
cwd=$(pwd)
cd "$(dirname "$0")"
mkdir -p $DESTINATION_DIRECTORY

# Create clusters csv
export OBJECT_NAME=clusters
export FILE_NAME=$OBJECT_NAME.csv 
export JSON_TEMPLATE="Cluster,{.name},{.cluster.server}"
echo $JSON_TEMPLATE | tr -d '"?=[](){}@\\/' | tr . _ > $DESTINATION_DIRECTORY$FILE_NAME
oc config view --minify -o jsonpath='{range .clusters[*]}'$JSON_TEMPLATE'{"\n"}{end}' >> $DESTINATION_DIRECTORY$FILE_NAME
tail $DESTINATION_DIRECTORY$FILE_NAME


# Create nodes csv
export OBJECT_NAME=nodes
export FILE_NAME=$OBJECT_NAME.csv 
export JSON_TEMPLATE="{.kind},{.metadata.name},{.metadata.labels.node\.kubernetes\.io\/instance-type},{.status.addresses[?(@.type==\"InternalIP\")].address},{.status.nodeInfo.operatingSystem},Cluster"
echo $JSON_TEMPLATE | tr -d '"?=[](){}@\\/' | tr . _ > $DESTINATION_DIRECTORY$FILE_NAME
oc get --all-namespaces $OBJECT_NAME -o=jsonpath='{range .items[*]}'$JSON_TEMPLATE'{"\n"}{end}' >> $DESTINATION_DIRECTORY$FILE_NAME
echo "oc get --all-namespaces $OBJECT_NAME -o=jsonpath='{range .items[*]}$JSON_TEMPLATE{\"\\n\"}{end}'"
tail $DESTINATION_DIRECTORY$FILE_NAME

# Create namespaces csv
export OBJECT_NAME=namespaces
export FILE_NAME=$OBJECT_NAME.csv 
export JSON_TEMPLATE="{.kind},{.metadata.name},{.status.phase}"
echo $JSON_TEMPLATE | tr -d '"?=[](){}@\\/' | tr . _ > $DESTINATION_DIRECTORY$FILE_NAME
oc get --all-namespaces $OBJECT_NAME -o=jsonpath='{range .items[*]}'$JSON_TEMPLATE'{"\n"}{end}' >> $DESTINATION_DIRECTORY$FILE_NAME
tail $DESTINATION_DIRECTORY$FILE_NAME


# Create pods csv
export OBJECT_NAME=pods
export FILE_NAME=$OBJECT_NAME.csv 
export JSON_TEMPLATE="{.kind},{.metadata.name},{.metadata.namespace},{.metadata.labels.app},{.metadata.labels.tier},{.metadata.ownerReferences[*].kind},{.metadata.ownerReferences[*].name},{.status.phase},{.status.hostIP},{.status.podIP},{.status.containerStatuses.image},{.status.startTime}"
echo $JSON_TEMPLATE | tr -d '"?=[](){}@\\/' | tr . _ > $DESTINATION_DIRECTORY$FILE_NAME
oc get --all-namespaces $OBJECT_NAME -o=jsonpath='{range .items[*]}'$JSON_TEMPLATE'{"\n"}{end}' >> $DESTINATION_DIRECTORY$FILE_NAME
tail $DESTINATION_DIRECTORY$FILE_NAME

cd $cwd