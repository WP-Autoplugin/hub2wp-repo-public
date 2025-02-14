# hub2wp

hub2wp is a free and open, GitHub-based plugin repository that makes it easy to discover and install WordPress plugins hosted on GitHub. 

It works by scanning public GitHub repositories that have the `wordpress-plugin` topic. It is a read-only service, and no code is hosted on hub2wp. All plugin details are retrieved directly from GitHub.

The complementary [hub2wp Plugin](https://hub2wp.com/plugin?id=903597688) can be used to install and update GitHub plugins directly from your WordPress dashboard, just like you would with plugins from the official WordPress Plugin Directory.

### Requirements for a Plugin to Appear in hub2wp Repo

To be listed in hub2wp, a plugin must:

* Be hosted on GitHub as a public repository.
* Have the topic `wordpress-plugin` added to the repository.
* Have a `readme.txt` or a `README.md` in the root directory and include a `Stable tag` header.

Once these requirements are met, the plugin will automatically appear in the hub2wp Plugin Repo. Due to technical constraints, it may take up to 24 hours for a plugin to appear after meeting the requirements.
