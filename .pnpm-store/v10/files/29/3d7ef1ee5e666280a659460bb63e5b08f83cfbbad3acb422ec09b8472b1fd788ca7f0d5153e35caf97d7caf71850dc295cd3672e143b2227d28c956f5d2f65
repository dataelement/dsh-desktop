#include <errno.h>
#include <fcntl.h>
#include <string.h>
#include <unistd.h>

int main (int argc, char** argv) {
  char *slave_path = ttyname(STDIN_FILENO);
  // open implicit attaches a process to a terminal device if:
  // - process has no controlling terminal yet
  // - O_NOCTTY is not set
  close(open(slave_path, O_RDWR));

  char *cwd = argv[1];
  char *file = argv[2];
  argv = &argv[2];

  if (strlen(cwd) && chdir(cwd) == -1) {
    _exit(1);
  }

  execvp(file, argv);
  return 1;
}
