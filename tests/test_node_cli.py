import unittest

from unittest import mock as mock
from unittest.mock import MagicMock, patch, Mock
from click.testing import CliRunner

from vantage6.cli.globals import APPNAME
from vantage6.cli.node import (
    cli_node_list, 
    cli_node_new_configuration,
    cli_node_files
)

class NodeCLITest(unittest.TestCase):

    @patch("docker.DockerClient.ping")
    def test_list_docker_not_running(self, docker_ping):
        """The docker status is determined by the docker.ping"""
        docker_ping.side_effect = Exception('Boom!')

        runner = CliRunner()
        result = runner.invoke(cli_node_list, [])

        # check exit code
        self.assertEqual(result.exit_code, 1)

        # check that an error message is given
        self.assertEqual(result.stdout[:7], "[error]")
        # pass
    
    @patch("vantage6.cli.context.NodeContext.available_configurations")
    @patch("docker.DockerClient.ping")
    @patch("docker.DockerClient.containers")
    def test_list(self, containers, docker_ping, available_configurations):
        # https://docs.python.org/3/library/unittest.mock.html#mock-names-and-the-name-attribute
        
        # mock that docker-deamon is running
        docker_ping.return_value = True

        # docker deamon returns a list of running node-containers
        container1 = MagicMock()
        container1.name = f"{APPNAME}-iknl-user"
        container2 = MagicMock()
        # container2.name = f"{APPNAME}-iknl-system"
        containers.list.return_value = [container1]

        # returns a list of configurations and failed inports
        def side_effect(system_folders):
            config = MagicMock(available_environments=["Application"])
            config.name = "iknl"
            if not system_folders:
                return [[config], []]
            else:
                return [[config], []]

        available_configurations.side_effect = side_effect

        # invoke CLI method
        runner = CliRunner()
        result = runner.invoke(cli_node_list, [])

        # validate exit code 
        self.assertEqual(result.exit_code, 0)

        # check printed lines
        self.assertEqual(result.output, 
        "\nName                     Environments                    Status          System/User\n"
        "-------------------------------------------------------------------------------------\n"
        "iknl                     ['Application']                 Offline          System \n"
        "iknl                     ['Application']                 Online           User   \n"
        "-------------------------------------------------------------------------------------\n"
        )

    # @patch("questionary.prompts.text", return_value="config_name")
    # def test_new_config(self):     
    #     runner = CliRunner()
    #     result = runner.invoke(cli_node_new_configuration, input="henk\n")
    #     print(result.exit_code)
    #     print(result.stdout)
    #     print(result.exception)

    @patch("vantage6.cli.node.NodeContext")
    @patch("vantage6.cli.node.select_configuration_questionaire")
    def test_files(self, select_config, context):
        
        context.config_exists.return_value = True
        context.return_value = MagicMock(
            config_file="/file.yaml",
            log_file="/log.log",
            data_dir="/dir"
        )
        context.return_value.databases.items.return_value = [["label","/file.db"]]
        select_config.return_value = ["iknl", "application"]

        print(select_config)
        runner = CliRunner()
        result = runner.invoke(cli_node_files, [])
        
        # TODO checks!  

        print(result.stdout)
