# Web-Builder

A Simple Node.js Application that Interacts with Gemini AI Using a Single API

## Overview

**Web-Builder** is a straightforward Node.js application designed to interact with Gemini AI through a single API. This tool enables users to perform various AI-driven tasks effortlessly.

## Getting Started

Follow the steps below to set up and run the Web-Builder application.

### Prerequisites

- Install [Node.js](https://nodejs.org/) from the official website.
- Create a `.env` file in root folder and paste ```API_KEY=YOUR_GEMINI_API_KEY```

### Installation

Open your terminal and execute the following command to install the necessary dependencies:

```bash
npm install
```

### Usage

After installing the dependencies, start the application by running:

```bash
node AiBuild.js
```

### Commands

Type `help` in the terminal to view the available commands:

```bash
help
```

## Contributing

We welcome contributions from the community. To contribute to this project, please follow these steps:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Commit your changes (`git commit -am 'Add new feature'`).
4. Push to the branch (`git push origin feature-branch`).
5. Create a new Pull Request.

## Support

If you have any questions or need support, feel free to reach out to us.

---

![Gemini AI](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASsAAACoCAMAAACPKThEAAABmFBMVEUAAAADAAAAAAIAAgAgfv8gfP8if/8gfP4JjfsQh/wpfPkHj/sgev8Vhf8egf8Yg//vT14HDB2TkP9ukP4RJTpfj/1zivILjv8cVaU1LUVjNUQPiPsMkP8ICxcof/kTEhgxL0FKRmNzbJ2YjNSvoP4LFyoZRoAlY8MldOkgfPEjc9seXKYROWYAAQqUV369bZ2rYo43IzEZCAmxRUzaT1m8R1MrExI/OlliWo4PJUQcgOkXUZSgX5HQcrjNS1pvZ66klP+TgtvGervIcLjScqxcNktGHiKRk/UlIjUZUp9LLT/wV2Y3FRlKUoIUMFYhZLoWP2R2S2+CTHxpLjSZOEZ9dcRgkvZHQ29OhdVAIiszHCM6bLEQToISfNIhhug3Xp0nL0xYcb92huCsjfKXfMx9WoV7SWK9X4TWaJKzTWtTKjSGca7Gg9fYbaHbXIafSmKDNT0JITAbdsI3Q3W4aKEgV4u8hN/tWnNhWH17bLouJkd9XZCmbavEe8W0ie8YBhnjZJjmXoGAPE0PIkkML0pVZ6pUTYYEFzTRnOOxAAAJLUlEQVR4nO2ai1vTyBbAkzSPtnnUIiWtfeDea1oaiui69wp0WcpDa3Vpl1UrCrRVlGVXwOteQe9DVi+6+2/fM5OmTUsf+JH9KN93fj5oMtOZ5tczM2cSGAZBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBEARBjjF61h/gHHH5rD/AOeKrs/4A54i/nKQSx9mvWIbrVfEL4KCt7rAs51ZH7vHXk1bk4sH4n/lBzgFXIv1qwNdvJFNjCSBtjmesM6dn4urktetdS7++8c3f/u5GNy5y88pUnxosM53yi7wkCAKvaZo6k+09ek7Kt7Ozs5NdG/ruwoUL37nQi3twzFxuvk8dNhyQNFEReFEkqtRAYCbjQtcTC4uLs0u3unyu7++Bqwu3XejHRfJDuTs9KximICiSyJulcCGcSgQ0+KOPu9AzdXW3S+HX1NX3LnTjHstDQ7m5XhWO0glBEM1ksH5cLKkBNRD94fRdrywszl7rWnoDVN04fSduMnJxpGdgGWlFkBJJ8pJlrcmlaAa0cTdmrLs/rjDdM5D7D+6fvgs3Wb4IroYedimF6zAFRUgfWVkVa/spgSqXkh+um3OPO+27h1EOEVm5R90qFHhFSRt1S4581B24hhHowONxt3G3WQ2FQNbFofxo57Fg+IWEWHREFKVDVXa4+KnzJvxy7Y7jLZFIezbnaMzz+JcnbYWDk7qvxcqWq6EueUNB5MVS32+aXd+QCZXqsH3qh2q1ajBM7ekI8GzZOvno4fwm8LwexXdevHhxCxpf+fHqFhxe+ml7e3tv7+dfrNLbDx48uO3afurUVGVZDzVldVCSViTe6KcqU4l5Zdnrhf/kNcZqpxoKlaeZarlcHoHVY+QZia2HuVxuk/KSvi+ys7PzAn6+WZydZJ5c293dJa72Pr6ipfchafiHixd7CjgSVbrsDYV6RFZGVMRUv1l2XfdFo7GYLMdIbG1YZrNeb9l4GgJX5Ys0tILMwzykJ5asQyrLdvXt4uIbdnLXdrW394rovv92QFzBKhbc0HWv7NUbsvKRY4tPQZTEZJ+m1qM+Xa9ki68/JX+NeXV9g8YVcbUGsVWt1f5Jx+HnuZF8fu5R5OYUjMPDzQh8WZGDpqs3S0uTW3cfX3pFZT1miKt7A+GKJZeok3GjO2Qdz0lTkiJO927KiKpqdK0+fosVrx7bJ6+qJGLLa1ad5RFKvkaP4vN0FHrA1QG44pj/LkBSunTVqvuEhNbPDHH19t4Zu/LQ2bJoRokrGDcxvT4Mh0BWvm0bPQYZu9E46jhvlVTVN26VwWI5XPHKFTpfwfQVWoXuaAL71KEKxh4MRDLiwdUBdfUeXBFVNKofE1kMdfX27OMqnjXVgM/n08lkDKEVKlNZI3Q6mbrsqDkmKX7nLauS5vf7E/a/NCQT06qqzjhqVMH+Olz/vg6yivbZDB2FjUoksIKWq/9QV+8XF+wyjvnJGoRn7cqYzmRLpgY7YQ3CgUYWGYVeexSCrNyVK89fvrt5mdYfk4SE01WKFwRJkug/CDmYysYDmpqENIhGK8uxhuyN/Qov90HVamPFfx0CV/9uNPMvcAVHkUPiiqGuVpqdvILAugQpxJm6gitiOaOYNTWhLguWefI3GnLImn/5rrE9HJMgZXC0kNJ4gijykmK5MgMBtaWTCqRZ8GNfl2PVxsk4ZA7PmnXmNudbXO28f++43bC1vf2BuPr49u3/XDbwBdhfczDrD2gB1QdrvUxDS5frU1Z+rmUbnQItR47jZLhBShB4cJUI+AJRYAaQKwBpME5dyeuNKY64etrMK+fydVeHDVe/NTtpuPr48QxdOQBbKpFFEsiYHpOtYTjXcj+dZbKQM2S7NMALsPmJE+cWxHw9UI3jrkItrnK2q0PL1c5Oi6vdwXLFsCWVTll0zop5iavVtlszLJOB0Wq2rH+cBUknBDFIXQWoKDCl6zQbleXX4CrmjbW4KjtdDeXzxBUkWtQV5FkTzS62di1Xe8TVgGykk9ZiaK2Fuh5a61AnrSj8cIfzMPgUYQzUBXitZAy3wRBXei9XQySBaLo6aHO1e4u42huQuCL3o4ppMg6txTAq73eqVuAVqdSpIMkLUhh++nnNPN44zRkcrkYhK3G4+gyuHHH1vM3Vku1qbzBcUYp0GNIZC1SxHeI9mJAErdODCJKlkoze5CWt/aEhd8zVRLsrewxudnS1NICumIydZclkfe90/wOmcCk93LgPZxPWBCFFXpAdY8H5Vrbuypqv6ozSMdjAdgX5O9kogKuDDq4+DJYrpkBlResb3k6YgqKMHbWdhPVRSBhkHE9D4KWDzXtybGVjmqjbl52uyHy12nz7Z9jwEFf5nOXqsMXVyuwSeRJ268P2YLliTE1TYamPd3VlwPQu0MSBZev3fNkSqNLq9x9SEs+bLB3ApImNaJRunlvjqp+rwwPHOLZd7W5vD5aroqoFfPp613KIHPIgRzST9jcfLKRhp6OF64eGn4fS+s7PqPh8qpc8HduPxU7gKp/r6Gp2tu5qy41LdI8U5EczPcpZ5o8xHuQI/lS4UAiXTJFubwqNChlN4fmAWUgms6UoLBbRT+RsNkZz0Trxilduc1VjmJrtavNw0+lqcdFytbs7YK6OwFXP23kcw46LZMssKBJsI3lFUcR0xjFmMwnRL/B2+h4t0rm9zZXsrbS6GqlRV3nL1Warq4UBdQW735me2TG54TWdSsAUD0ggSvRn2ZYEw0jxvEJ+1QG2mGaQ9Xhgps/KxJX98C8u67GN5hs+W3cdarBXn4Lv4pgrK66WBs9VNpBiJvrWsn+nyG+GO6RbxbCZSKgJc5zMWzS9KK6vr39quOKS60nHQ/3a8vIy7BlHl3///Sa4+mrq0TvHJ4isrKxcZ5jrW1tb1wfnOQ7lSD3BL71Y1zwx6rEOuOOl7Ch9PMhybDMV447V6nC65yNAt55uu0X6jy9+C9f1AqHkRA/XaQMeD8lx2fr95/NAx/1eH7p+3Sd9UOyod040UbonV0g7tbP+AOcIo38VpM6ALTUIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIcn75Pw//owqnw4JHAAAAAElFTkSuQmCC)



---

> **Note:** Ensure you have an active internet connection to interact with Gemini AI.

---

Happy Coding! 🚀

---

## ⭐️ Star the Repository

If you find this project useful, please give it a star on GitHub to show your support and help others discover it.
