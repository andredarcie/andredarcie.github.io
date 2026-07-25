from __future__ import annotations

import csv
import re
import unicodedata
from collections import defaultdict
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from statistics import mean
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
SOURCES_DIR = ROOT / "fontes"
ACCESS_DATE = date(2026, 7, 25).isoformat()
MAX_EDITORIAL_ITEMS = 20


AUTHORS: dict[str, str] = {
    "97 Things Every Programmer Should Know": "Kevlin Henney (editor)",
    "A Discipline of Programming": "Edsger W. Dijkstra",
    "A Little Java, A Few Patterns": "Matthias Felleisen; Daniel P. Friedman",
    "A Pattern Language": "Christopher Alexander; Sara Ishikawa; Murray Silverstein",
    "A Philosophy of Software Design": "John Ousterhout",
    "Accelerate": "Nicole Forsgren; Jez Humble; Gene Kim",
    "Agile Software Development: Principles, Patterns, and Practices": "Robert C. Martin",
    "Agile Software Development: The Cooperative Game": "Alistair Cockburn",
    "AI Engineering": "Chip Huyen",
    "Artificial Intelligence for Dummies": "John Paul Mueller; Luca Massaron",
    "Artificial Intelligence: A Modern Approach": "Stuart Russell; Peter Norvig",
    "Algorithms": "Robert Sedgewick; Kevin Wayne",
    "Apprenticeship Patterns": "Dave Hoover; Adewale Oshineye",
    "Automate the Boring Stuff with Python": "Al Sweigart",
    "Beautiful Data": "Toby Segaran; Jeff Hammerbacher (editors)",
    "Become an Effective Software Engineering Manager": "James Stanier",
    "Being Geek": "Michael Lopp",
    "Build a Large Language Model (From Scratch)": "Sebastian Raschka",
    "Building Microservices": "Sam Newman",
    "Clean Agile": "Robert C. Martin",
    "Clean Architecture": "Robert C. Martin",
    "Clean Code": "Robert C. Martin",
    "Clean Craftsmanship": "Robert C. Martin",
    "Code": "Charles Petzold",
    "Code Complete": "Steve McConnell",
    "Code Craft": "Pete Goodliffe",
    "Code Simplicity": "Max Kanat-Alexander",
    "Coder to Developer": "Mike Gunderloy",
    "Coders at Work": "Peter Seibel",
    "Continuous Delivery": "Jez Humble; David Farley",
    "Cracking the Coding Interview": "Gayle Laakmann McDowell",
    "Debugging the Development Process": "Steve Maguire",
    "Design Patterns": "Erich Gamma; Richard Helm; Ralph Johnson; John Vlissides",
    "Designing Data-Intensive Applications": "Martin Kleppmann",
    "Designing Web APIs": "Brenda Jin; Saurabh Sahni; Amir Shevat",
    "Distributed Systems for Fun and Profit": "Mikito Takada",
    "Domain-Driven Design": "Eric Evans",
    "Domain-Driven Design Distilled": "Vaughn Vernon",
    "Don't Make Me Think": "Steve Krug",
    "Effective Java": "Joshua Bloch",
    "Eloquent JavaScript": "Marijn Haverbeke",
    "Enterprise Integration Patterns": "Gregor Hohpe; Bobby Woolf",
    "Essential Scrum": "Kenneth S. Rubin",
    "Extreme Ownership": "Jocko Willink; Leif Babin",
    "Extreme Programming Explained": "Kent Beck; Cynthia Andres",
    "Facts and Fallacies of Software Engineering": "Robert L. Glass",
    "Fluent Python": "Luciano Ramalho",
    "Fundamentals of Software Architecture": "Mark Richards; Neal Ford",
    "Get Your Hands Dirty on Clean Architecture": "Tom Hombergs",
    "Getting Real": "Jason Fried; David Heinemeier Hansson; Matthew Linderman",
    "Grokking Algorithms": "Aditya Y. Bhargava",
    "Grokking the System Design Interview": "Design Gurus",
    "Growing Object-Oriented Software, Guided by Tests": "Steve Freeman; Nat Pryce",
    "Hackers & Painters": "Paul Graham",
    "Hands-On Machine Learning": "Aurélien Géron",
    "Head First Design Patterns": "Eric Freeman; Elisabeth Robson; Bert Bates; Kathy Sierra",
    "Head First Java": "Kathy Sierra; Bert Bates",
    "Head First Object-Oriented Analysis and Design": "Brett McLaughlin; Gary Pollice; David West",
    "Introduction to Algorithms": "Thomas H. Cormen; Charles E. Leiserson; Ronald L. Rivest; Clifford Stein",
    "Java Concurrency in Practice": "Brian Goetz; Tim Peierls; Joshua Bloch; Joseph Bowbeer; David Holmes; Doug Lea",
    "JavaScript: The Good Parts": "Douglas Crockford",
    "Laws of Software Engineering": "Milan Milanović",
    "Lean Architecture": "James O. Coplien; Gertrud Bjørnvig",
    "Lean DevOps": "Robert Benefield",
    "Managing Humans": "Michael Lopp",
    "Mastering PostgreSQL": "Hans-Jürgen Schönig",
    "Modern C++ Design": "Andrei Alexandrescu",
    "Modern Software Engineering": "David Farley",
    "Multi-Paradigm Design for C++": "James O. Coplien",
    "Murphy's Law and Other Reasons Why Things Go Wrong": "Arthur Bloch",
    "Nonviolent Communication": "Marshall B. Rosenberg",
    "Object-Oriented Software Engineering": "Bernd Bruegge; Allen H. Dutoit",
    "On Lisp": "Paul Graham",
    "Paradigms of Artificial Intelligence Programming": "Peter Norvig",
    "Pattern Hatching": "John Vlissides",
    "Patterns of Enterprise Application Architecture": "Martin Fowler",
    "Peopleware": "Tom DeMarco; Tim Lister",
    "Perfect Software": "Gerald M. Weinberg",
    "PHP & MySQL: Server-side Web Development": "Jon Duckett",
    "Programming Clojure": "Stuart Halloway",
    "Programming Pearls": "Jon Bentley",
    "Python Crash Course": "Eric Matthes",
    "Rapid Development": "Steve McConnell",
    "Refactoring": "Martin Fowler",
    "Release It!": "Michael T. Nygard",
    "Rework": "Jason Fried; David Heinemeier Hansson",
    "RxJS in Action": "Paul P. Daniels; Luis Atencio",
    "Scalability Rules": "Martin L. Abbott; Michael T. Fisher",
    "Site Reliability Engineering": "Betsy Beyer; Chris Jones; Jennifer Petoff; Niall Richard Murphy",
    "Soft Skills": "John Sonmez",
    "Software Architecture for Developers": "Simon Brown",
    "Software Architecture: The Hard Parts": "Neal Ford; Mark Richards; Pramod Sadalage; Zhamak Dehghani",
    "Software Design Decoded": "Marian Petre; André van der Hoek",
    "Software Engineering at Google": "Titus Winters; Tom Manshreck; Hyrum Wright",
    "Software Engineering for Absolute Beginners": "Nico Loubser",
    "Software Engineering: A Practitioner's Approach": "Roger S. Pressman; Bruce R. Maxim",
    "Software Estimation": "Steve McConnell",
    "Software Patterns": "James O. Coplien",
    "Software Project Survival Guide": "Steve McConnell",
    "So Good They Can't Ignore You": "Cal Newport",
    "Solid Code": "Donis Marshall",
    "Structure and Interpretation of Computer Programs": "Harold Abelson; Gerald Jay Sussman; Julie Sussman",
    "Succinctly book series": "Syncfusion authors",
    "System Design Interview": "Alex Xu",
    "Team Topologies": "Matthew Skelton; Manuel Pais",
    "Test-Driven Development: By Example": "Kent Beck",
    "The 100-Page Machine Learning Book": "Andriy Burkov",
    "The Advantage": "Patrick Lencioni",
    "The Architecture of Open Source Applications": "Amy Brown; Greg Wilson (editors)",
    "The Art of Computer Programming": "Donald E. Knuth",
    "The Art of Unit Testing": "Roy Osherove",
    "The Back of the Napkin": "Dan Roam",
    "The C Programming Language": "Brian W. Kernighan; Dennis M. Ritchie",
    "The Clean Coder": "Robert C. Martin",
    "The Complete Software Developer's Career Guide": "John Sonmez",
    "The DevOps Handbook": "Gene Kim; Jez Humble; Patrick Debois; John Willis",
    "The Effective Engineer": "Edmond Lau",
    "The Five Dysfunctions of a Team": "Patrick Lencioni",
    "The Goal": "Eliyahu M. Goldratt; Jeff Cox",
    "The Hitchhiker's Guide to the Galaxy": "Douglas Adams",
    "The Hundred-Page Language Models Book": "Andriy Burkov",
    "The Imposter's Handbook": "Rob Conery",
    "The Intentional Stance": "Daniel C. Dennett",
    "The Linux Programming Interface": "Michael Kerrisk",
    "The Macintosh Way": "Guy Kawasaki",
    "The Mythical Man-Month": "Frederick P. Brooks Jr.",
    "The Phoenix Project": "Gene Kim; Kevin Behr; George Spafford",
    "The Pragmatic Programmer": "Andrew Hunt; David Thomas",
    "The Problem with Software": "Adam Barr",
    "The Productive Programmer": "Neal Ford",
    "The Self-Taught Programmer": "Cory Althoff",
    "The Software Architect's Handbook": "Joseph Ingeno",
    "The Software Craftsman": "Sandro Mancuso",
    "The Software Engineer's Guidebook": "Gergely Orosz",
    "The Start-up of You": "Reid Hoffman; Ben Casnocha",
    "The Timeless Way of Building": "Christopher Alexander",
    "The Unicorn Project": "Gene Kim",
    "The War of Art": "Steven Pressfield",
    "Thinking in Java": "Bruce Eckel",
    "Tidy First?": "Kent Beck",
    "Types and Programming Languages": "Benjamin C. Pierce",
    "Understanding Distributed Systems": "Roberto Vitillo",
    "User Stories Applied": "Mike Cohn",
    "Working Effectively with Legacy Code": "Michael C. Feathers",
    "Working in Public": "Nadia Eghbal",
    "You Don't Know JS Yet": "Kyle Simpson",
    "Zero to One": "Peter Thiel; Blake Masters",
}


def books(*titles: str) -> list[str]:
    return list(titles)


@dataclass(frozen=True)
class Source:
    source_id: str
    title: str
    publisher: str
    url: str
    publication_date: str
    nature: str
    order_type: str
    scope: str
    notes: str
    book_titles: list[str]


SOURCES: list[Source] = [
    Source(
        "algomaster",
        "5 Books Every Software Engineer Should Read (at least once)",
        "AlgoMaster",
        "https://blog.algomaster.io/p/5-best-software-engineering-books",
        "2025-02-25",
        "curadoria_individual",
        "lista_numerada",
        "Fundamentos independentes de linguagem, arquitetura e APIs.",
        "Lista curta baseada nos livros relidos pelo autor.",
        books("Clean Code", "Head First Design Patterns", "Designing Data-Intensive Applications", "Building Microservices", "Designing Web APIs"),
    ),
    Source(
        "bytebytego",
        "10 Books for Software Developers",
        "ByteByteGo",
        "https://bytebytego.com/guides/guides/10-books-for-software-developers/",
        "",
        "curadoria_empresa",
        "ordem_editorial",
        "Programação, arquitetura, padrões, algoritmos e entrevistas.",
        "A página agrupa os livros por assunto; a ordem de exibição foi preservada.",
        books("The Pragmatic Programmer", "Code Complete", "Clean Code", "Refactoring", "Designing Data-Intensive Applications", "System Design Interview", "Design Patterns", "Domain-Driven Design", "Introduction to Algorithms", "Cracking the Coding Interview"),
    ),
    Source(
        "charlax_professional_programming",
        "Professional Programming — Must-read books",
        "charlax / GitHub",
        "https://github.com/charlax/professional-programming",
        "",
        "curadoria_open_source",
        "ordem_editorial",
        "Livros essenciais de programação profissional e sistemas.",
        "Foram usados somente os itens da seção 'Must-read books'.",
        books("The Pragmatic Programmer", "Code Complete", "Release It!", "Scalability Rules", "The Linux Programming Interface", "Structure and Interpretation of Computer Programs"),
    ),
    Source(
        "codealchemy",
        "Best Books Every Developer Should Read (2026 Guide)",
        "CodeAlchemy",
        "https://codealchemy.in/blog/best-books-every-developer-should-read-2026-guide",
        "2026-04",
        "curadoria_individual",
        "lista_numerada",
        "Boas práticas, sistemas de dados, refatoração e JavaScript.",
        "Lista de cinco livros em ordem numérica.",
        books("Clean Code", "The Pragmatic Programmer", "Designing Data-Intensive Applications", "Refactoring", "You Don't Know JS Yet"),
    ),
    Source(
        "codingexercises",
        "40+ books every developer should read",
        "Coding Exercises",
        "https://www.codingexercises.com/reviews/books-every-developer-should-read",
        "2018-10-18",
        "curadoria_individual",
        "lista_numerada",
        "Lista ampla de desenvolvimento, carreira e cultura.",
        "A fonte possui 42 itens; foram usados os 20 primeiros para comparabilidade.",
        books(
            "Clean Code", "Head First Design Patterns", "The Software Craftsman", "Refactoring",
            "Working Effectively with Legacy Code", "Test-Driven Development: By Example",
            "Growing Object-Oriented Software, Guided by Tests", "Continuous Delivery",
            "The Pragmatic Programmer", "Murphy's Law and Other Reasons Why Things Go Wrong",
            "Effective Java", "Design Patterns", "Thinking in Java", "The Macintosh Way",
            "The Hitchhiker's Guide to the Galaxy", "A Discipline of Programming", "Code Complete",
            "Extreme Programming Explained", "97 Things Every Programmer Should Know", "Clean Architecture",
        ),
    ),
    Source(
        "dailydev",
        "12 Best Software Engineering Books for Developers",
        "daily.dev",
        "https://daily.dev/blog/12-best-software-engineering-books-for-developers-in-2024/",
        "2024-09-04",
        "curadoria_empresa",
        "lista_numerada",
        "Qualidade de código, arquitetura, algoritmos, DevOps e entrevistas.",
        "O artigo foi publicado em 2024 e contém nota editorial para 2026.",
        books(
            "Clean Code", "Design Patterns", "The Pragmatic Programmer", "Code Complete", "Refactoring",
            "Introduction to Algorithms", "The Clean Coder", "Domain-Driven Design", "Continuous Delivery",
            "Building Microservices", "Designing Data-Intensive Applications", "Cracking the Coding Interview",
        ),
    ),
    Source(
        "devto_meta_36",
        "20 Most-Recommended Books for Software Developers",
        "DEV Community / Andrew (awwsmm)",
        "https://dev.to/awwsmm/20-most-recommended-books-for-software-developers-5578",
        "2019-10-19",
        "meta_ranking_36_fontes",
        "meta_ranking",
        "Meta-lista de 36 fontes e 297 livros únicos.",
        "O autor normalizou edições e ordenou por percentual de fontes que recomendaram cada livro.",
        books(
            "Clean Code", "The Pragmatic Programmer", "Code Complete", "Design Patterns", "Refactoring",
            "The Mythical Man-Month", "Working Effectively with Legacy Code", "Programming Pearls", "Peopleware",
            "Soft Skills", "The Clean Coder", "Don't Make Me Think", "Cracking the Coding Interview",
            "Head First Design Patterns", "Introduction to Algorithms",
            "Agile Software Development: Principles, Patterns, and Practices", "Code",
            "The Art of Computer Programming", "Clean Architecture", "Patterns of Enterprise Application Architecture",
        ),
    ),
    Source(
        "devot",
        "Top Software Engineering Books: Recommended by Devōt",
        "Devōt",
        "https://devot.team/blog/software-engineering-books",
        "2024-07-23",
        "curadoria_equipe",
        "lista_numerada",
        "Recomendações da equipe, incluindo programação, dados e carreira.",
        "A recomendação bônus 'Rework' não foi contada na lista principal de nove itens.",
        books("Design Patterns", "You Don't Know JS Yet", "RxJS in Action", "Domain-Driven Design", "Succinctly book series", "Clean Code", "Head First Design Patterns", "Mastering PostgreSQL", "The Pragmatic Programmer"),
    ),
    Source(
        "ellow",
        "7 Books Every Software Developer Must Read Right Now",
        "Ellow",
        "https://ellow.io/7-books-every-software-developer-must-read-right-now/",
        "",
        "curadoria_empresa",
        "lista_numerada",
        "Fundamentos de código, gestão de projetos, padrões e algoritmos.",
        "A recomendação bônus 'The Lean Startup' foi excluída.",
        books("Clean Code", "The Mythical Man-Month", "The Pragmatic Programmer", "Design Patterns", "Refactoring", "Introduction to Algorithms", "Peopleware"),
    ),
    Source(
        "exponent",
        "The Top 12 Best Software Engineering Books You Need To Read",
        "Exponent",
        "https://www.tryexponent.com/blog/the-top-12-best-software-engineering-books-you-need-to-read",
        "",
        "curadoria_equipe",
        "ordem_editorial",
        "Livros gerais de engenharia de software e preparação profissional.",
        "A página declara não usar links de afiliados para esta seleção.",
        books("Clean Code", "The Pragmatic Programmer", "The Mythical Man-Month", "Design Patterns", "Refactoring", "Code Complete", "Domain-Driven Design", "Working Effectively with Legacy Code", "Test-Driven Development: By Example", "Peopleware", "Cracking the Coding Interview", "Code"),
    ),
    Source(
        "frankc",
        "A Timeless Software Developer Reading List",
        "Frank Chen",
        "https://frankc.net/dev-reading-list",
        "",
        "curadoria_individual",
        "ordem_editorial",
        "Lista ampla: técnica, carreira, produto e colaboração.",
        "A fonte possui 24 livros; foram usados os 20 primeiros na ordem publicada.",
        books(
            "So Good They Can't Ignore You", "Zero to One", "Design Patterns", "Introduction to Algorithms",
            "Effective Java", "The War of Art", "Don't Make Me Think", "JavaScript: The Good Parts",
            "Hackers & Painters", "Clean Code", "Being Geek", "The Start-up of You", "Peopleware",
            "Managing Humans", "The Five Dysfunctions of a Team", "The Advantage", "Rework", "Refactoring",
            "The Pragmatic Programmer", "Clean Architecture",
        ),
    ),
    Source(
        "geeksforgeeks",
        "10 Programming Books That Every Programmer Must Read Once in 2025",
        "GeeksforGeeks",
        "https://www.geeksforgeeks.org/blogs/best-programming-books/",
        "2025-07-28",
        "curadoria_empresa",
        "lista_numerada",
        "Clássicos de programação, construção, algoritmos e design.",
        "O item bônus 'Coders at Work' não foi contado.",
        books("Clean Code", "The Mythical Man-Month", "The Pragmatic Programmer", "Code Complete", "The Art of Computer Programming", "Programming Pearls", "Code", "Introduction to Algorithms", "Refactoring", "Design Patterns"),
    ),
    Source(
        "gitdailies",
        "4 Classic Books on Software Engineering",
        "GitDailies",
        "https://gitdailies.com/articles/classic-software-engineering-books/",
        "2022-03-16",
        "curadoria_empresa",
        "ordem_editorial",
        "Quatro clássicos duráveis de engenharia de software.",
        "A ordem da seção 'The Must-Read Books' foi preservada.",
        books("The Pragmatic Programmer", "Clean Code", "Refactoring", "Design Patterns"),
    ),
    Source(
        "guru99",
        "15 BEST Software Engineering Books (2026 Update)",
        "Guru99",
        "https://www.guru99.com/software-engineer-book.html",
        "2024-12-20",
        "curadoria_comercial",
        "lista_numerada",
        "Engenharia de software, padrões, carreira, Agile, DevOps e IA.",
        "A página possui links comerciais/afiliados; a data exibida é anterior ao ano do título.",
        books("Clean Code", "Design Patterns", "Patterns of Enterprise Application Architecture", "Enterprise Integration Patterns", "Code Complete", "Refactoring", "Soft Skills", "User Stories Applied", "Peopleware", "The Pragmatic Programmer", "Head First Design Patterns", "The Clean Coder", "Working in Public", "The DevOps Handbook", "Artificial Intelligence for Dummies"),
    ),
    Source(
        "happycoders",
        "The 34 Best Software Engineering Books",
        "HappyCoders.eu",
        "https://www.happycoders.eu/books/genres/software-engineering/",
        "",
        "curadoria_individual",
        "ordem_editorial",
        "Engenharia, design, testes, arquitetura, DevOps e carreira.",
        "A fonte contém 34 itens; foram usados os 20 primeiros.",
        books(
            "Clean Code", "Design Patterns", "Refactoring", "Clean Craftsmanship",
            "Working Effectively with Legacy Code", "The Pragmatic Programmer",
            "Growing Object-Oriented Software, Guided by Tests", "Pattern Hatching", "The Clean Coder",
            "Agile Software Development: Principles, Patterns, and Practices", "Clean Architecture",
            "Domain-Driven Design", "Implementing Domain-Driven Design", "Extreme Programming Explained",
            "The Unicorn Project", "Accelerate", "Get Your Hands Dirty on Clean Architecture",
            "Domain-Driven Design Distilled", "Clean Agile", "The Complete Software Developer's Career Guide",
        ),
    ),
    Source(
        "interviewbit",
        "10 Best Software Engineering Books",
        "InterviewBit",
        "https://www.interviewbit.com/blog/software-engineering-books/",
        "2023-06-05",
        "curadoria_empresa",
        "lista_numerada",
        "Do iniciante ao especialista: entrevistas, algoritmos, código e design.",
        "A ordem combina trilhas de iniciante, intermediário e especialista.",
        books("Cracking the Coding Interview", "Introduction to Algorithms", "Clean Code", "Clean Architecture", "Code Complete", "Code", "The Art of Computer Programming", "Programming Pearls", "A Philosophy of Software Design", "The Pragmatic Programmer"),
    ),
    Source(
        "itsourcecode",
        "Best Programming Books for Self-Taught Developers (2026 Reading List)",
        "ITSourceCode",
        "https://itsourcecode.com/blogs/best-programming-books-for-self-taught-developers-2026/",
        "2026-06-22",
        "curadoria_comercial",
        "lista_numerada",
        "Fundamentos, Python, Java, web, arquitetura e IA/ML.",
        "A página informa links de afiliados e foi atualizada em 2026-07-01.",
        books("The Pragmatic Programmer", "Clean Code", "Cracking the Coding Interview", "Python Crash Course", "Automate the Boring Stuff with Python", "Fluent Python", "Effective Java", "Head First Java", "Eloquent JavaScript", "You Don't Know JS Yet", "PHP & MySQL: Server-side Web Development", "Designing Data-Intensive Applications", "System Design Interview", "Hands-On Machine Learning", "AI Engineering"),
    ),
    Source(
        "javaguides",
        "10 Must-Read Books for Every Software Engineer",
        "Java Guides",
        "https://www.javaguides.net/2024/12/10-must-read-books-for-every-software-engineer.html",
        "2024-12",
        "curadoria_individual",
        "lista_numerada",
        "Conselhos gerais, qualidade, arquitetura, padrões e algoritmos.",
        "A lista é geral apesar do foco habitual do site em Java.",
        books("The Pragmatic Programmer", "Code Complete", "Clean Code", "Refactoring", "Designing Data-Intensive Applications", "System Design Interview", "Design Patterns", "Domain-Driven Design", "Algorithms", "Cracking the Coding Interview"),
    ),
    Source(
        "kiview_gist",
        "Software Engineering Reading List",
        "kiview / GitHub Gist",
        "https://gist.github.com/kiview/dd636f4ece4f677c812e37863c1ecc18",
        "",
        "curadoria_open_source",
        "ordem_editorial",
        "OOP, testes, arquitetura, cultura e carreira.",
        "Foram preservadas as seções e a ordem do Gist.",
        books("Design Patterns", "Code Complete", "Clean Code", "The Art of Unit Testing", "Software Architecture for Developers", "The Software Craftsman", "The Pragmatic Programmer", "The Clean Coder"),
    ),
    Source(
        "listium_utsav",
        "Books Every Software Engineer Must Read in 2023",
        "Engineering with Utsav / Listium",
        "https://listium.com/@engineeringwithutsav/91417/books-every-software-engineer-must-read-in-2023",
        "2023-10-26",
        "curadoria_individual",
        "ordem_editorial",
        "Algoritmos, práticas de código, sistemas distribuídos, DevOps e ML.",
        "A ordem visual entre categorias foi preservada.",
        books("Grokking Algorithms", "Clean Code", "Clean Architecture", "Understanding Distributed Systems", "Designing Data-Intensive Applications", "Software Architecture: The Hard Parts", "Lean DevOps", "The 100-Page Machine Learning Book"),
    ),
    Source(
        "mentorcruise",
        "Top Software Development books curated by experts",
        "MentorCruise",
        "https://mentorcruise.com/books/softwaredevelopment/",
        "2026",
        "curadoria_especialistas",
        "ordem_editorial",
        "Fundamentos, automação, system design, Python, LLMs e sistemas de dados.",
        "A página afirma que os títulos vêm de mentores profissionais e são atualizados anualmente.",
        books("A Philosophy of Software Design", "Code", "Automate the Boring Stuff with Python", "System Design Interview", "Python Crash Course", "Build a Large Language Model (From Scratch)", "Designing Data-Intensive Applications"),
    ),
    Source(
        "milan_2026",
        "The Software Engineering Books I keep recommending",
        "Tech World With Milan",
        "https://newsletter.techworld-with-milan.com/p/best-software-engineering-books-2026",
        "2026-06-04",
        "curadoria_especialista",
        "ordem_editorial",
        "Código, princípios, arquitetura, dados, IA, testes, entrega e carreira.",
        "Inclui um livro do próprio autor, explicitamente identificado na fonte.",
        books("The Pragmatic Programmer", "Clean Code", "A Philosophy of Software Design", "Laws of Software Engineering", "Fundamentals of Software Architecture", "Software Architecture: The Hard Parts", "Designing Data-Intensive Applications", "Understanding Distributed Systems", "The Hundred-Page Language Models Book", "AI Engineering", "The Art of Unit Testing", "Accelerate", "Refactoring"),
    ),
    Source(
        "mostrecommendedbooks",
        "12 Best Programming Books",
        "Most Recommended Books",
        "https://mostrecommendedbooks.com/lists/best-programming-books",
        "2025-08-02",
        "meta_ranking_5_mais_fontes",
        "meta_ranking",
        "Consenso de listas especializadas e recomendações públicas.",
        "A página informa que cada livro apareceu em pelo menos duas fontes.",
        books("The Pragmatic Programmer", "Clean Code", "The Mythical Man-Month", "Code Complete", "Code", "Introduction to Algorithms", "The Art of Computer Programming", "Structure and Interpretation of Computer Programs", "Programming Pearls", "Cracking the Coding Interview", "Design Patterns", "Refactoring"),
    ),
    Source(
        "rockstar",
        "15 Best Books for Software Developers (2026)",
        "Rockstar Developer University",
        "https://rockstardeveloperuniversity.com/best-books-for-software-developers/",
        "2026-02-19",
        "curadoria_individual",
        "lista_numerada",
        "Código, carreira, design, legado, entrega e IA.",
        "O autor também recomenda dois livros próprios; essa relação foi mantida e documentada.",
        books("Clean Code", "The Pragmatic Programmer", "Soft Skills", "Code Complete", "The Mythical Man-Month", "Design Patterns", "Refactoring", "Working Effectively with Legacy Code", "The Complete Software Developer's Career Guide", "A Philosophy of Software Design", "Cracking the Coding Interview", "Accelerate", "The Software Engineer's Guidebook", "Tidy First?", "AI Engineering"),
    ),
    Source(
        "serverless",
        "7 Must Read Books for Becoming a Better Software Developer",
        "Serverless Framework",
        "https://www.serverless.com/blog/software-engineering-resources",
        "2017-04-17",
        "curadoria_equipe",
        "ordem_editorial",
        "Qualidade, profissionalismo, DevOps, práticas, padrões e legado.",
        "A página diz não ter associação com autores ou plataformas listadas.",
        books("Clean Code", "The Clean Coder", "The Phoenix Project", "The Pragmatic Programmer", "Design Patterns", "The Imposter's Handbook", "Refactoring"),
    ),
    Source(
        "shortform",
        "100 Best Software Engineering Books of All Time",
        "Shortform",
        "https://www.shortform.com/best-books/genre/best-software-engineering-books-of-all-time",
        "2025",
        "ranking_dados_e_especialistas",
        "ranking_explicito",
        "Ranking baseado em recomendações, vendas e avaliações de leitores.",
        "A fonte possui 100 itens; foram usados os 20 primeiros.",
        books("Clean Code", "The Pragmatic Programmer", "The Mythical Man-Month", "Code Complete", "The Lean Startup", "Design Patterns", "Structure and Interpretation of Computer Programs", "Refactoring", "Clean Architecture", "Code", "The Clean Coder", "Domain-Driven Design", "Cracking the Coding Interview", "Designing Data-Intensive Applications", "Head First Design Patterns", "Working Effectively with Legacy Code", "Peopleware", "The Phoenix Project", "Patterns of Enterprise Application Architecture", "Don't Make Me Think"),
    ),
    Source(
        "sizovs",
        "The best books for software developers 2026",
        "Eduard Sizov",
        "https://sizovs.net/books/",
        "2026",
        "curadoria_especialista",
        "ordem_editorial",
        "Prática profissional, testes, entrega, pessoas e comunicação.",
        "A lista é mantida e atualizada pelo autor; todos os 17 itens visíveis foram usados.",
        books("The Pragmatic Programmer", "Head First Design Patterns", "Head First Object-Oriented Analysis and Design", "Clean Code", "The Clean Coder", "Test-Driven Development: By Example", "Growing Object-Oriented Software, Guided by Tests", "The Phoenix Project", "The Software Craftsman", "Soft Skills", "Continuous Delivery", "Release It!", "Peopleware", "Extreme Ownership", "Nonviolent Communication", "The Goal", "Domain-Driven Design"),
    ),
    Source(
        "software_engineering_books",
        "Software Engineering Books",
        "software-engineering-books.com",
        "https://software-engineering-books.com/",
        "",
        "curadoria_individual",
        "ordem_editorial",
        "Núcleo de engenharia e referências rápidas relevantes a desenvolvedores.",
        "Foram usados os livros das seções de engenharia e referência rápida; um curso em vídeo foi excluído.",
        books("Clean Code", "The Pragmatic Programmer", "The Mythical Man-Month", "Release It!", "Essential Scrum", "Code Complete", "Patterns of Enterprise Application Architecture", "Refactoring", "Code", "Introduction to Algorithms", "Cracking the Coding Interview", "Designing Data-Intensive Applications"),
    ),
    Source(
        "squash",
        "24 influential books programmers should read",
        "Squash.io",
        "https://www.squash.io/24-influential-books-programmers-should-read/",
        "2023-06-02",
        "curadoria_individual",
        "ordem_editorial",
        "Escrita de código, engenharia de software e mentalidade.",
        "A fonte possui 24 itens; foram usados os 20 primeiros.",
        books("Code Craft", "Solid Code", "The Clean Coder", "Debugging the Development Process", "Refactoring", "Code Complete", "Clean Code", "Code Simplicity", "Rapid Development", "Software Project Survival Guide", "Agile Software Development: The Cooperative Game", "Getting Real", "Perfect Software", "Coder to Developer", "Software Estimation", "Software Engineering: A Practitioner's Approach", "Facts and Fallacies of Software Engineering", "The Intentional Stance", "The Back of the Napkin", "The Timeless Way of Building"),
    ),
    Source(
        "studentprojectcode",
        "Best Software Engineering Books in 2026",
        "Student Project Code",
        "https://studentprojectcode.com/blog/best-software-engineering-books-in-year",
        "2025-09-20",
        "lista_comercial_dinamica",
        "ranking_explicito",
        "Livros atuais de fundamentos, sistemas, carreira, liderança e IA.",
        "A página exibe uma lista de compra dinâmica para julho de 2026.",
        books("The Pragmatic Programmer", "Designing Data-Intensive Applications", "AI Engineering", "The Software Engineer's Guidebook", "Software Engineering at Google", "Clean Code", "Design Patterns", "Become an Effective Software Engineering Manager", "Modern Software Engineering", "Software Engineering for Absolute Beginners"),
    ),
    Source(
        "thesgn",
        "The 7 Most Important Books Every Aspiring Software Engineer Must Read in 2025",
        "The SGN",
        "https://www.thesgn.blog/blog/csbook",
        "2025",
        "curadoria_individual",
        "lista_numerada",
        "Código, dados, system design, algoritmos e confiabilidade.",
        "A fonte contém links de download; o levantamento registra apenas títulos e ordem, não redistribui arquivos.",
        books("Clean Code", "Designing Data-Intensive Applications", "Grokking the System Design Interview", "Design Patterns", "Introduction to Algorithms", "The Pragmatic Programmer", "Site Reliability Engineering"),
    ),
    Source(
        "threadreader_pierre",
        "The 25 most recommended programming books of all-time",
        "Pierre de Wulf / Thread Reader",
        "https://threadreaderapp.com/thread/1229731043332231169.html",
        "2020-02-18",
        "meta_ranking_68_listas",
        "meta_ranking",
        "Meta-ranking de mais de 1.200 recomendações coletadas em 68 listas.",
        "Foram preservados todos os 25 lugares do ranking publicado.",
        books(
            "The Pragmatic Programmer", "Clean Code", "Code Complete", "Refactoring",
            "Head First Design Patterns", "The Mythical Man-Month", "The Clean Coder",
            "Working Effectively with Legacy Code", "Design Patterns", "Cracking the Coding Interview",
            "Soft Skills", "Don't Make Me Think", "Code", "Introduction to Algorithms", "Peopleware",
            "Programming Pearls", "Patterns of Enterprise Application Architecture",
            "Structure and Interpretation of Computer Programs", "The Art of Computer Programming",
            "Domain-Driven Design", "Coders at Work", "Rapid Development", "The Self-Taught Programmer",
            "Algorithms", "Continuous Delivery",
        ),
    ),
    Source(
        "upgrad",
        "Top 10 Software Engineering Books Every Developer Should Read",
        "upGrad",
        "https://www.upgrad.com/blog/top-software-engineering-books-to-read-to-improve-your-skills/",
        "2026-07-07",
        "curadoria_comercial",
        "lista_numerada",
        "Código, arquitetura, sistemas de dados, fundamentos e legado.",
        "O artigo promove cursos da empresa; a lista de livros foi extraída separadamente.",
        books("Clean Code", "The Pragmatic Programmer", "Designing Data-Intensive Applications", "Software Engineering at Google", "The Software Architect's Handbook", "Object-Oriented Software Engineering", "Structure and Interpretation of Computer Programs", "Working Effectively with Legacy Code", "Code", "Refactoring"),
    ),
    Source(
        "wearedevelopers",
        "The Ultimate Developer Reading List for 2023",
        "WeAreDevelopers",
        "https://www.wearedevelopers.com/en/magazine/best-software-development-books",
        "2023",
        "curadoria_empresa",
        "ordem_editorial",
        "Programação, testes, arquitetura, distribuídos, DevOps, ML e equipes.",
        "A fonte possui mais de 20 itens e uma menção honorária; foram usados os 20 primeiros livros.",
        books("Modern C++ Design", "The Pragmatic Programmer", "Clean Code", "Head First Design Patterns", "Refactoring", "Grokking Algorithms", "Designing Data-Intensive Applications", "The Art of Unit Testing", "Test-Driven Development: By Example", "Growing Object-Oriented Software, Guided by Tests", "Fundamentals of Software Architecture", "Software Architecture: The Hard Parts", "Distributed Systems for Fun and Profit", "The DevOps Handbook", "Continuous Delivery", "Accelerate", "The 100-Page Machine Learning Book", "The Five Dysfunctions of a Team", "Team Topologies", "Cracking the Coding Interview"),
    ),
    Source(
        "xebia",
        "Ultimate List of 110 Must Read Software Development Books",
        "Xebia",
        "https://xebia.com/blog/ultimate-list-of-110-must-read-software-development-books/",
        "2026-01-28",
        "curadoria_empresa",
        "lista_numerada",
        "Lista extensa e eclética de linguagens, design, IA e desenvolvimento.",
        "A fonte possui 110 itens; foram usados os 20 primeiros.",
        books("Types and Programming Languages", "C++ and Patterns", "Software Patterns", "Multi-Paradigm Design for C++", "Lean Architecture", "Effective Java", "Java Concurrency in Practice", "Beautiful Data", "Artificial Intelligence: A Modern Approach", "Paradigms of Artificial Intelligence Programming", "On Lisp", "Refactoring", "Patterns of Enterprise Application Architecture", "A Little Java, A Few Patterns", "A Pattern Language", "Code Complete", "The C Programming Language", "The Pragmatic Programmer", "Programming Clojure", "Head First book series"),
    ),
    Source(
        "devbooks_github",
        "Top Books on Software Engineering",
        "DevBooks / GitHub",
        "https://github.com/devtoolsd/DevBooks/blob/main/data/software-engineering.md",
        "",
        "curadoria_open_source",
        "ordem_editorial",
        "Fundamentos modernos de código, arquitetura, legado e microserviços.",
        "Lista versionada em repositório público; a ordem do arquivo foi preservada.",
        books("The Pragmatic Programmer", "Code Complete", "Clean Code", "Clean Architecture", "A Philosophy of Software Design", "Refactoring", "Working Effectively with Legacy Code", "Design Patterns", "Fundamentals of Software Architecture", "The Mythical Man-Month", "The Clean Coder", "Building Microservices"),
    ),
]


# Livros presentes apenas em fontes específicas e que não têm uma chave comum acima.
AUTHORS.update(
    {
        "C++ and Patterns": "James O. Coplien",
        "Head First book series": "Kathy Sierra; Bert Bates",
        "Implementing Domain-Driven Design": "Vaughn Vernon",
        "The Lean Startup": "Eric Ries",
    }
)


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"[^a-z0-9]+", "-", ascii_text).strip("-")


def csv_write(path: Path, fieldnames: list[str], rows: list[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def source_weight(position: int, total: int) -> float:
    return (total - position + 1) / total


def validate_sources() -> None:
    ids = [source.source_id for source in SOURCES]
    if len(ids) != len(set(ids)):
        raise ValueError("Há IDs de fontes duplicados.")

    for source in SOURCES:
        if not source.url.startswith("https://"):
            raise ValueError(f"URL inválida em {source.source_id}: {source.url}")
        if not source.book_titles:
            raise ValueError(f"Fonte sem livros: {source.source_id}")
        if len(source.book_titles) != len(set(source.book_titles)):
            raise ValueError(f"Livro duplicado dentro da fonte: {source.source_id}")
        if source.order_type != "meta_ranking" and len(source.book_titles) > MAX_EDITORIAL_ITEMS:
            raise ValueError(f"Fonte editorial excede o limite de {MAX_EDITORIAL_ITEMS}: {source.source_id}")
        missing = [title for title in source.book_titles if title not in AUTHORS]
        if missing:
            raise ValueError(f"Autores ausentes em {source.source_id}: {missing}")


def write_source_files() -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    mention_rows: list[dict[str, object]] = []
    source_index: list[dict[str, object]] = []

    for source in SOURCES:
        total = len(source.book_titles)
        source_dir = SOURCES_DIR / source.source_id
        source_dir.mkdir(parents=True, exist_ok=True)
        rows: list[dict[str, object]] = []

        for position, title in enumerate(source.book_titles, 1):
            weight = source_weight(position, total)
            row = {
                "posicao": position,
                "titulo_na_fonte": title,
                "titulo_normalizado": title,
                "autor": AUTHORS[title],
                "peso_posicao": f"{weight:.6f}",
                "url_fonte": source.url,
            }
            rows.append(row)
            mention_rows.append(
                {
                    **row,
                    "fonte_id": source.source_id,
                    "fonte_titulo": source.title,
                    "natureza_fonte": source.nature,
                    "tipo_ordem": source.order_type,
                    "peso_posicao_num": weight,
                }
            )

        csv_write(
            source_dir / "livros.csv",
            ["posicao", "titulo_na_fonte", "titulo_normalizado", "autor", "peso_posicao", "url_fonte"],
            rows,
        )

        info = f"""# {source.title}

- **Publicador/curador:** {source.publisher}
- **URL:** {source.url}
- **Domínio:** {urlparse(source.url).netloc}
- **Data de publicação/atualização identificada:** {source.publication_date or "não identificada"}
- **Data de acesso:** {ACCESS_DATE}
- **Acessibilidade na checagem final:** HTTP 200 em {ACCESS_DATE}
- **Natureza:** `{source.nature}`
- **Tipo de ordem:** `{source.order_type}`
- **Quantidade usada:** {total}
- **Escopo:** {source.scope}
- **Observações:** {source.notes}

## Critério de extração

A posição segue a ordem numérica ou visual da página. Quando a fonte não declara que a
ordem é um ranking comparativo, ela é tratada apenas como ordem editorial. Edições,
subtítulos e pequenas variações foram consolidados no campo `titulo_normalizado`.

O peso de cada posição é:

`peso_posicao = (quantidade_da_lista - posicao + 1) / quantidade_da_lista`

Assim, o primeiro item recebe peso 1 e o último recebe `1 / quantidade_da_lista`.
"""
        (source_dir / "fonte.md").write_text(info, encoding="utf-8")

        source_index.append(
            {
                "fonte_id": source.source_id,
                "titulo": source.title,
                "publicador": source.publisher,
                "dominio": urlparse(source.url).netloc,
                "url": source.url,
                "data_publicacao_atualizacao": source.publication_date,
                "data_acesso": ACCESS_DATE,
                "status_http_na_coleta": 200,
                "natureza": source.nature,
                "tipo_ordem": source.order_type,
                "quantidade_livros": total,
                "escopo": source.scope,
                "observacoes": source.notes,
            }
        )

    return mention_rows, source_index


def build_final_ranking(mention_rows: list[dict[str, object]]) -> list[dict[str, object]]:
    grouped: dict[str, list[dict[str, object]]] = defaultdict(list)
    for row in mention_rows:
        grouped[str(row["titulo_normalizado"])].append(row)

    total_sources = len(SOURCES)
    unsorted: list[dict[str, object]] = []
    for title, rows in grouped.items():
        positions = [int(row["posicao"]) for row in rows]
        position_weight = sum(float(row["peso_posicao_num"]) for row in rows)
        occurrences = len(rows)
        average_position_weight = position_weight / occurrences
        # A frequência já recompensa cada aparição. Usar a média do peso como bônus
        # evita contar a frequência duas vezes e garante que mais ocorrências dominem.
        final_score = occurrences + average_position_weight
        sources = sorted(str(row["fonte_id"]) for row in rows)
        unsorted.append(
            {
                "titulo_normalizado": title,
                "autor": AUTHORS[title],
                "ocorrencias": occurrences,
                "total_fontes": total_sources,
                "percentual_fontes": round(occurrences / total_sources * 100, 2),
                "peso_posicao_somado": round(position_weight, 6),
                "peso_posicao_medio": round(average_position_weight, 6),
                "pontuacao_final": round(final_score, 6),
                "melhor_posicao": min(positions),
                "posicao_media": round(mean(positions), 2),
                "fontes": "|".join(sources),
            }
        )

    unsorted.sort(
        key=lambda row: (
            -float(row["pontuacao_final"]),
            -int(row["ocorrencias"]),
            int(row["melhor_posicao"]),
            float(row["posicao_media"]),
            str(row["titulo_normalizado"]).casefold(),
        )
    )
    for rank, row in enumerate(unsorted, 1):
        row["rank_final"] = rank
    return unsorted


def write_readme(source_index: list[dict[str, object]], ranking: list[dict[str, object]], mentions: int) -> None:
    meta_sources = sum(1 for source in SOURCES if source.order_type == "meta_ranking")
    explicit_rankings = sum(1 for source in SOURCES if source.order_type == "ranking_explicito")
    numbered = sum(1 for source in SOURCES if source.order_type == "lista_numerada")
    editorial = sum(1 for source in SOURCES if source.order_type == "ordem_editorial")
    top = ranking[:10]
    top_table = "\n".join(
        f"| {row['rank_final']} | {row['titulo_normalizado']} | {row['ocorrencias']} | "
        f"{row['peso_posicao_somado']:.6f} | {row['peso_posicao_medio']:.6f} | "
        f"{row['pontuacao_final']:.6f} |"
        for row in top
    )

    readme = f"""# Melhores livros para desenvolvimento de software

Levantamento realizado em **{ACCESS_DATE}** com **{len(SOURCES)} fontes**, **{mentions} menções**
e **{len(ranking)} títulos normalizados**.

## Resultado rápido

| Rank | Livro | Fontes | Peso acumulado | Bônus médio | Pontuação final |
|---:|---|---:|---:|---:|---:|
{top_table}

O ranking completo está em [`ranking_final.csv`](ranking_final.csv). O índice das fontes
está em [`fontes.csv`](fontes.csv), e a pasta [`fontes/`](fontes/) contém uma subpasta
por fonte com `fonte.md` e `livros.csv`.

## Metodologia

Cada aparição de um livro vale **1 ponto de recorrência**. A posição acrescenta um bônus
normalizado:

`peso_posicao = (N - posição + 1) / N`

onde `N` é o total de livros usado naquela fonte. Portanto, o primeiro recebe peso `1`,
e o último recebe `1/N`.

`bônus_médio = soma_dos_pesos_de_posição / ocorrências`

`pontuação_final = ocorrências + bônus_médio`

Esse desenho garante que a recorrência entre fontes seja o componente dominante e evita
contá-la duas vezes. As posições altas fornecem um bônus entre 0 e 1 para reforçar e
desempatar o consenso. Todas as fontes recebem o mesmo peso-base.

## Seleção e tratamento

- Foram incluídas páginas que recomendam livros para programação ou engenharia de software
  de forma geral e cuja ordem é reproduzível.
- Listas editoriais muito longas foram limitadas aos **20 primeiros itens**. O meta-ranking
  explícito de Pierre de Wulf manteve seus 25 itens.
- Edições, subtítulos e abreviações foram consolidados sob um título canônico.
- Um livro conta no máximo uma vez por fonte.
- A base contém {meta_sources} meta-rankings, {explicit_rankings} rankings explícitos,
  {numbered} listas numeradas e {editorial} listas em ordem editorial.
- CSVs usam vírgula como delimitador e UTF-8 com BOM para facilitar abertura no Excel.
- As 36 URLs responderam com HTTP 200 na checagem final de {ACCESS_DATE}.

## Como interpretar

O resultado mede **consenso de recomendação na web**, não qualidade absoluta. Há vieses de
popularidade, idioma inglês, listas com links de afiliados e sobreposição indireta entre
meta-rankings e algumas fontes primárias. A coluna `natureza` em `fontes.csv` e cada
`fonte.md` tornam esses casos visíveis.

## Página web

A página responsiva em `index.html` apresenta o ranking, permite buscar e filtrar livros,
expande as fontes de cada resultado e reúne as 36 fontes pesquisadas. Como os dados são
carregados dos CSVs, abra a pasta por um servidor local:

```powershell
python -m http.server 8000
```

Depois visite `http://localhost:8000/`.

## Reproduzir

Execute:

```powershell
python scripts/gerar_ranking.py
python scripts/validar_resultados.py
```
"""
    (ROOT / "README.md").write_text(readme, encoding="utf-8")


def main() -> None:
    validate_sources()
    mentions, source_index = write_source_files()
    ranking = build_final_ranking(mentions)

    csv_write(
        ROOT / "fontes.csv",
        [
            "fonte_id", "titulo", "publicador", "dominio", "url",
            "data_publicacao_atualizacao", "data_acesso", "status_http_na_coleta",
            "natureza", "tipo_ordem",
            "quantidade_livros", "escopo", "observacoes",
        ],
        source_index,
    )
    csv_write(
        ROOT / "ranking_final.csv",
        [
            "rank_final", "titulo_normalizado", "autor", "ocorrencias", "total_fontes",
            "percentual_fontes", "peso_posicao_somado", "peso_posicao_medio", "pontuacao_final",
            "melhor_posicao", "posicao_media", "fontes",
        ],
        ranking,
    )
    csv_write(
        ROOT / "todas_mencoes.csv",
        [
            "fonte_id", "fonte_titulo", "natureza_fonte", "tipo_ordem", "posicao",
            "titulo_na_fonte", "titulo_normalizado", "autor", "peso_posicao", "url_fonte",
        ],
        mentions,
    )
    write_readme(source_index, ranking, len(mentions))

    print(f"Fontes: {len(SOURCES)}")
    print(f"Menções: {len(mentions)}")
    print(f"Títulos únicos: {len(ranking)}")
    print(f"Top 1: {ranking[0]['titulo_normalizado']} ({ranking[0]['pontuacao_final']})")


if __name__ == "__main__":
    main()
