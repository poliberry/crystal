pw-metadata -n settings 0 update 0 \
  '{ "rules": [
      { "matches": [
          { "application.name": "YourAppName" }
        ],
        "actions": {
          "update-props": { "steam.capture.sink": false }
        }
      }
    ] }'
