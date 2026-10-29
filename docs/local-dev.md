# Local development

## Requirements

- Docker with Compose v2
- Node.js 22+
- Python 3.10+ with `pyyaml` (exercise validation)

## Start the infrastructure

```bash
cp .env.example .env
cp infra/judge0.conf.example infra/judge0.conf   # then change the passwords
docker compose up -d
./infra/judge0-smoke.sh
```

## Judge0 on Ubuntu 22.04 and newer: cgroup v1

Judge0 1.13.x uses `isolate`, which needs cgroup v1. Ubuntu 22.04+ boots with
cgroup v2 by default, and then every submission fails with an internal error.

Check which one you have:

```bash
stat -fc %T /sys/fs/cgroup    # "cgroup2fs" = v2, "tmpfs" = v1
```

Switch to v1 (affects the whole machine; revert by removing the parameter):

```bash
sudo sed -i 's/GRUB_CMDLINE_LINUX="/GRUB_CMDLINE_LINUX="systemd.unified_cgroup_hierarchy=0 /' /etc/default/grub
sudo update-grub && sudo reboot
```

For production, run Judge0 on a dedicated VM configured this way rather than on the
same host as the app.

## Without Judge0

`app/scripts/fake-judge0.mjs` implements the small part of the Judge0 API the app uses
and runs Python **without any sandbox**. It exists only for tests and quick UI work on
machines where Judge0 cannot run. Never expose it to a network.
