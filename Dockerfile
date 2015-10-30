FROM centos:7

MAINTAINER kevin.yung@rea-group.com

RUN \
  yum update --security -y

# EPEL Repo
ENV EPEL_REPO_PKG epel-release
RUN \
  yum install -y $EPEL_REPO_PKG

# Java Dependency
ENV JAVA_PKGS "java-1.8.0-openjdk-devel maven"
RUN \
  yum install -y $JAVA_PKGS

RUN \
  alternatives --set java $(       \
    alternatives --display java  | \
    grep -v "^ "                 | \
    grep 'priority [0-9]\+'      | \
    awk -F' - ' '{print $1}'     | \
    grep java-1.8.0-openjdk      | \
    sort -nr | head -n1) &&        \
  alternatives --set javac $(      \
    alternatives --display javac | \
    grep -v "^ "                 | \
    grep 'priority [0-9]\+'      | \
    awk -F' - ' '{print $1}'     | \
    grep java-1.8.0-openjdk      | \
    sort -nr                     | \
    head -n1)

# Misc utils
ENV UTILS_PKGS "git bind-utils jq python-pip make zip"
RUN \
  yum install -y $UTILS_PKGS

# Install awscli
RUN \
  pip install awscli

COPY . /cwd/

WORKDIR /cwd

# Start the Maven build
RUN \
  make build

ENTRYPOINT ["make"]

CMD ["deploy"]
