#!/bin/bash
targetpath='/backup/mongobak'
# nowtime='20181012'
nowtime=$(date +"%Y%m%d" -d "-1day")

expdata()
{
  mongoexport -d myinfo -c person -q "{timeStamp: /^${nowtime}/}" -o ${targetpath}/${nowtime}.json
}

impdata()
{
  mongoimport -h rs2:27017 -d myinfo -c person --file ${targetpath}/${nowtime}.json --mode merge
}

execute()
{
  expdata
  if [ $? -eq 0 ]
  then
    impdata
    if [ $? -eq 0 ]
    then
      echo "back successfully!"
    else
      echo "import failure!"
    fi
  else
    echo "export failure!"
  fi
}
 
if [ ! -d "${targetpath}/" ]
then
 mkdir ${targetpath}
fi
execute
echo "============== back end ${nowtime} =============="