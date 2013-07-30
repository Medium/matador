#!/bin/bash

test_runner_bin=./node_modules/falkor/bin/runner.js

export PORT=9797
export NODE_PATH=./node_modules:./src
export NODE_ENV=test

if [ "$JUNIT" == "" ]; then
  nodeunit_opts=''
else
  nodeunit_opts='--reporter=junit --output reports/'
fi

for entry in `find tests/integration -maxdepth 1`; do
  if [[ -d $entry ]] && [[ -f ${entry}_test.js ]]; then
    test_name=`basename $entry`
    echo "Booting $test_name server..."
    cp src/all/server.js $entry/

    if [[ -f ${entry}/beforeBoot.sh ]]; then
      eval "$(cat ${entry}/beforeBoot.sh)"
    fi

    nohup node $entry/server.js 2>&1 > $test_name-server.out &
    server_pid=$!

    sleep 1

    if [[ -f ${entry}/afterBoot.sh ]]; then
      eval "$(cat ${entry}/afterBoot.sh)"
    fi

    echo "Running $test_name integration tests..."
    $test_runner_bin $nodeunit_opts ${entry}_test.js
    integration_test_exit_code=$?

    kill $server_pid 2> /dev/null
    echo "Server output:"
    cat $test_name-server.out
    echo
    rm -f $test_name-server.out
    rm -f $entry/server.js

    if [ $integration_test_exit_code -ne 0 ]; then
      echo "Test(s) for $test_name failed, stopping"
      exit $integration_test_exit_code
    fi
  fi
done
