export interface BusykoalaFile {
  directory: string
  fileName: string
  content: string
}

export const files: BusykoalaFile[] = [
  {
    directory: "/home/busykoala",
    fileName: "education.txt",
    content: `<br>
      ZHAW, 2020-2024 (computer science)<br>
      GIBB, 2018-2020 (application developer EFZ)<br>
      ETH, 2016-2017 (mechanical engineering)
      `
  },
  {
    directory: "/home/busykoala",
    fileName: "employments.md",
    content: `<br>
      # Employments<br>
      - [2023-]: DevOps Engineer | Genossenschaft Migros Aare<br>
      - [2020-2022]: Security Engineer | cyllective AG<br>
      - [2018-2020]: Application Developer | 4teamwork AG<br>
      - [2017-2018]: Scientific Collaborator | Insel Gruppe
      `
  },
  {
    directory: "/home/busykoala",
    fileName: "languages.md",
    content: `<br>
      # My Languages<br>
      - German, native<br>
      - English, business fluent
      `
  },
  {
    directory: "/home/busykoala",
    fileName: "links",
    content: `<br>
      --> <a href="https://github.com/busykoala" target="_blank">Github</a><br>
      --> <a href="https://www.linkedin.com/in/matthias-osswald/" target="_blank">LinkedIn</a><br>
      --> <a href="https://fosstodon.org/@busykoala" target="_blank">Mastodon</a><br>
      --> <a href="mailto:info@busykoala.io?subject=Kontaktformular%20(busykoala.io)" target="_blank">Mail</a><br>
      --> <a href="https://keybase.io/busykoala" target="_blank">Keybase</a>
    `
  },
  {
    directory: "/home/busykoala/.ssh",
    fileName: "id_ed25519.pub",
    content: `<br>
      ssh-ed25519 aHR0cHM6Ly93d3cueW91dHViZS5jb20vd2F0Y2g/dj1kUXc0dzlXZ1hjUSAtbgo= busykoala
      `
  },
  {
    directory: "/home/busykoala/.ssh",
    fileName: "id_ed25519",
    content: `<br>
      -----BEGIN OPENSSH PRIVATE KEY-----<br>
      VmpGYVYySXhWWGROVldoVllUSjRWbFpyV25kVWJIQlhWVzVLYkdKSVFrWldSekYzWVRGWmVGZHNi<br>
      RlZOVmtwSVdWUkdUMUl4WkhWUgpiR2hwVWxSQ05GZFdZM2hUYlZaV1RWVnNXQXBpV0ZKUFdWUkdj<br>
      MDB4V1hoVmEzUnBZVE5rTlZaWE5VZFVaM0JYVFRGS1dGWnFRbXRVCmJWRjRZMFZzYWxORk5WbFZi<br>
      VEExVGtac1ZscElaRmRhTTBKWFZGVldXbVF4WkZoTlYzUnJDbUpGU2xOWmJtOTNVM2R2UFFvPQo=<br>
      -----END OPENSSH PRIVATE KEY-----
      `
  },
]
