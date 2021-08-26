
## The following environment variables must be set when running:

- `CONFIG_FOLDER` - path to a folder containing the configuration files
- `CONFIG_FILE` - (optional) the configuration file name, defaults to jarbas-config.json
- `GITHUB_WEBHOOK_SECRET` - the secret defined in your Github webhook
- `DEBUG` - when set to `true` will enable DEBUG level logging

---
## Configuration folder must have this structure
```
<CONFIG_FOLDER>
  |
  |-- <environments>
  |   |-- watcher-name1.env
  |   |-- watcher-name2.env
  |
  |-- jarbas-config.json
```
Files under "environments" folder will be passed as `--env-file` when starting the container for the watcher with the same name.

---

## Example of jarbas-config.json file

``` js
{
    "webhookPort": "2199",
    "webhookPath": "/your/webhook/path",
    "watchers": [
        {
            "name": "watcher-name1",
            "active": true,
            "github": {
                "url": "https://github.com/Some-Org/some-repository"
            },
            "docker": {
                "imageName": "watcher-name",
                "buildSources": [
                    "Dockerfile",
                    "src",
                    "tsconfig.json",
                    "package.json",
                    "package-lock.json"
                ]
            }
        },
        {
            "name": "watcher-name2",
            "active": true,
            "github": {
                "url": "https://github.com/Some-Org/some-other-repository"
            },
            "docker": {
                "imageName": "watcher-name2",
                "buildSources": [
                    "Dockerfile"
                ]
            }
        }
    ]
}
```

- `buildSources` are a list of files that must be present when building your image