#!/bin/bash
mongohost='rs2:27017'
mongodb='myinfo'
mongocol='person'

targetpath="/mongobak/${mongodb}"
# nowtime='20181012'
nowtime=$(date +"%Y%m%d" -d "-1day")

expdata()
{
  mongoexport -d ${mongodb} -c ${mongocol} -q "{timeStamp: /^${nowtime}/}" -o ${targetpath}/${mongocol}-${nowtime}.json
}

impdata()
{
  mongoimport -h ${mongohost} -d ${mongodb} -c ${mongocol} --file ${targetpath}/${mongocol}-${nowtime}.json --mode merge
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