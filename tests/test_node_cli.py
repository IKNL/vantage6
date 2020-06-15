import unittest

from unittest import mock as mock
from unittest.mock import MagicMock, patch, Mock
from click.testing import CliRunner

from vantage6.cli.node import cli_node_list
import docker




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

    # @patch("docker.APIClient.containers")

    @patch("docker.DockerClient.containers")
    def test_list(self, container_list):
        # https://docs.python.org/3/library/unittest.mock.html#mock-names-and-the-name-attribute

        #
        a = MagicMock()
        a.name = "vantage6-iknl-user"

        container_list.list.return_value = [a]

        runner = CliRunner()
        result = runner.invoke(cli_node_list, [])

        print("*"*80)
        print(result.output)
        print(result.exit_code)
        print(result.exception)
        # print(result.stdout)
        # print(result.stderr)