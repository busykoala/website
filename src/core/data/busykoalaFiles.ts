import { InitFileSystemNode } from "../addBaseFilesystem";

export const busykoalaFiles: InitFileSystemNode[] = [
    {
        type: "file",
        directory: "/home/busykoala",
        name: "education.txt",
        permissions: "rw-r--r--",
        owner: "busykoala",
        group: "busygroup",
        size: 123, // Placeholder size
        modified: new Date(),
        content: `<br>
      ZHAW, 2020-2024 (computer science)<br>
      GIBB, 2018-2020 (application developer EFZ)<br>
      ETH, 2016-2017 (mechanical engineering)
      `,
    },
    {
        type: "file",
        directory: "/home/busykoala",
        name: "experience.md",
        permissions: "rw-r--r--",
        owner: "busykoala",
        group: "busygroup",
        size: 456, // Placeholder size
        modified: new Date(),
        content: `<br>
      # Employments<br>
      - [2023-]: Co-Founder | megazord.studio<br>
      - [2023-2024]: DevOps Engineer | bespinian GmbH<br>
      - [2023]: DevOps Engineer | Genossenschaft Migros Aare<br>
      - [2020-2022]: Security Engineer | cyllective AG<br>
      - [2018-2020]: Application Developer | 4teamwork AG<br>
      - [2017-2018]: Scientific Collaborator | Insel Gruppe
      `,
    },
    {
        type: "file",
        directory: "/home/busykoala",
        name: "skillz.md",
        permissions: "rw-r--r--",
        owner: "busykoala",
        group: "busygroup",
        size: 789, // Placeholder size
        modified: new Date(),
        content: `<br>
      # Skillz<br>
      - **Languages:** Python, Bash, JavaScript, TypeScript, HTML, CSS, SQL, Java<br>
      - **Frameworks:** Django, Flask, FastAPI, Vue.js, React, Angular, Next.js, Express.js, Plone<br>
      - **Tools:** Git, Docker, Kubernetes, Istio, ArgoCD, Ansible, Terraform, OPA, Prometheus, Grafana, Elasticsearch, Jenkins, AWS, Azure, GCP<br>
      - **Databases:** PostgreSQL, MSSQL, MySQL, Redis, EventstoreDB, ZODB<br>
      - **Testing:** Pytest, Jest, JUnit, Playwright, Cypress, Puppeteer, Selenium<br>
      - **Operating Systems:** Linux, Windows, MacOS<br>
      - **Others:** CI/CD, Agile, Scrum, Kanban, TDD, BDD, DevOps, SRE, IT-Security
      `,
    },
    {
        type: "file",
        directory: "/home/busykoala",
        name: "languages.md",
        permissions: "rw-r--r--",
        owner: "busykoala",
        group: "busygroup",
        size: 234, // Placeholder size
        modified: new Date(),
        content: `<br>
      # My Languages<br>
      - German, native<br>
      - English, business fluent
      `,
    },
    {
        type: "file",
        directory: "/home/busykoala",
        name: "links",
        permissions: "rw-r--r--",
        owner: "busykoala",
        group: "busygroup",
        size: 345, // Placeholder size
        modified: new Date(),
        content: `<br>
      --> <a href="https://github.com/busykoala" target="_blank">Github</a><br>
      --> <a href="https://www.linkedin.com/in/matthias-osswald/" target="_blank">LinkedIn</a><br>
      --> <a href="https://fosstodon.org/@busykoala" target="_blank">Mastodon</a><br>
      --> <a href="mailto:info@busykoala.io?subject=Kontaktformular%20(busykoala.io)" target="_blank">Mail</a><br>
      --> <a href="https://keybase.io/busykoala" target="_blank">Keybase</a>
      `,
    },
    {
        type: "file",
        directory: "/home/busykoala/.ssh",
        name: "id_ed25519.pub",
        permissions: "rw-r--r--",
        owner: "busykoala",
        group: "busygroup",
        size: 123, // Placeholder size
        modified: new Date(),
        content: `<br>
      ssh-ed25519 aHR0cHM6Ly93d3cueW91dHViZS5jb20vd2F0Y2g/dj1kUXc0dzlXZ1hjUSAtbgo= busykoala
      `,
    },
    {
        type: "file",
        directory: "/home/busykoala/.ssh",
        name: "id_ed25519",
        permissions: "rw-------",
        owner: "busykoala",
        group: "busygroup",
        size: 234, // Placeholder size
        modified: new Date(),
        content: `<br>
      -----BEGIN OPENSSH PRIVATE KEY-----<br>
      VmpGYVYySXhWWGROVldoVllUSjRWbFpyV25kVWJIQlhWVzVLYkdKSVFrWldSekYzWVRGWmVGZHNi<br>
      RlZOVmtwSVdWUkdUMUl4WkhWUgpiR2hwVWxSQ05GZFdZM2hUYlZaV1RWVnNXQXBpV0ZKUFdWUkdj<br>
      MDB4V1hoVmEzUnBZVE5rTlZaWE5VZFVaM0JYVFRGS1dGWnFRbXRVCmJWRjRZMFZzYWxORk5WbFZi<br>
      VEExVGtac1ZscElaRmRhTTBKWFZGVldXbVF4WkZoTlYzUnJDbUpGU2xOWmJtOTNVM2R2UFFvPQo=<br>
      -----END OPENSSH PRIVATE KEY-----
      `,
    },
];
