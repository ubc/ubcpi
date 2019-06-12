# Setup development environment with docker-based Open edX Devstack

This is a quick setup guide for `ubcpi` developers to work with the **docker-based** Open edX devstack.

First we will setup the devstack containers.  We will then integrate the `ubcpi` development. 

## Setup the edX devstack
- On the host machine, create a working directory (e.g. we will use `edx_dev` for this setup guide). The setup process will create multiple sub-directories for edX sevices under this working directory.
- Under `edx_dev`, clone the repository `https://github.com/edx/devstack`.  
```
git clone https://github.com/edx/devstack
```
- Follow the instructions on [https://github.com/edx/devstack](https://github.com/edx/devstack) to setup the devstack. Once reached the step to start containers by executing `make dev.up`, check the Studio and LMS containers are working by visiting the following URLs:
```
http://localhost:18010/
http://localhost:18000/
```

Refer to the [devstack README](https://github.com/edx/devstack) for details on login information (email: `edx@example.com`, password: `edx`).

- The devstack comes with prod version of `ubcpi` module already.  Make sure it can be added before setting up the containers to use development version.  In Studio, create a new course or edit an existing course.
- When viewing the course, on the top menu, select Settings > Advanced Settings
- Under the section `Advanced Module List`, add `"ubcpi"` (with the double quotes) to the JSON list.  e.g.
```
[
    "ubcpi",
    "oppia"
]
```
Click save.
- In Studio, edit the course.  Create a new section, subsection, and then a New Unit.  Multiple buttons ("Advanced", "Discussion", "HTML, "Problem", "Video"...) should be displayed.  Click on the `Advanced` button.
- Make sure `Peer Instruction Question` (i.e. `ubcpi`) is listed as one of the options. Select it to add to the course.


## Setup ubcpi development
- The devstack setup process should created the directory `edx_dev/src`.  Change to that directory
- Clone the `ubcpi` repository by executing
```
git clone https://github.com/ubc/ubcpi
```
- In docker-based devstack, the Python `virtualenv` is not persistent.  We will need to install the the development version of `ubcpi` everytime the containers are restarted.  Edit `docker-compose.yml` under `edx_dev/devstack`
- Modify the sections for `lms` **and** `studio` containers.  Add the `pip install -e /edx/src/ubcpi` command. e.g.:

```
   lms:
-    command: bash -c 'source /edx/app/edxapp/edxapp_env && while true; do python /edx/app/edxapp/edx-platform/manage.py lms runserver 0.0.0.0:18000 --settings devstack_docker; sleep 2; done'
+    command: bash -c 'source /edx/app/edxapp/edxapp_env && pip install -e /edx/src/ubcpi && while true; do python /edx/app/edxapp/edx-platform/manage.py lms runserver 0.0.0.0:18000 --settings devstack_docker; sleep 2; done'
     container_name: edx.devstack.lms
     depends_on:
       - mysql
@@ -152,7 +152,7 @@ services:
       - edxapp_lms_assets:/edx/var/edxapp/staticfiles/
 
   studio:
-    command: bash -c 'source /edx/app/edxapp/edxapp_env && while true; do python /edx/app/edxapp/edx-platform/manage.py cms runserver 0.0.0.0:18010 --settings devstack_docker; sleep 2; done'
+    command: bash -c 'source /edx/app/edxapp/edxapp_env && pip install -e /edx/src/ubcpi && while true; do python /edx/app/edxapp/edx-platform/manage.py cms runserver 0.0.0.0:18010 --settings devstack_docker; sleep 2; done'
     container_name: edx.devstack.studio
```
- On the host, under the directory `edx_dev/devstack`, restart the devstack containers by executing the commands:
```
make down && make dev.up
```
- When the containers are up, check the development `ubcpi` package is installed properly. Execute the following command to start a shell to the `lms` container:
```
make lms-shell
```
- A shell to the `lms` container should be started.  Execute the follow commands to check the package installation:
```
source ../edxapp_env 
pip freeze | grep ubcpi
```
The result returned should be something like `-e git+https://github.com/ubc/ubcpi@ff69bbb8042e3c2acb268e8d680c739f9d71be59#egg=ubcpi_xblock`
- Make sure the package is pointing to the development git repository
- Type `exit` to exit the shell. Do similar check on the `studio` container by starting a shell with the following command:
```
make studio-shell
```
- If checked OK, launch Studio in browser and try to add the component to a course.

## Ready for ubcpi development
If setup properly, changes make to the code under the host directory `edx_dev/src/ubcpi` should be reflected in the containers.