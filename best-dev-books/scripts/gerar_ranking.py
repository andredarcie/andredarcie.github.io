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
LATEST_ACCESS_DATE = date(2026, 7, 26).isoformat()
# Fontes que substituíram as descartadas na revisão de escopo.
NEW_ACCESS_DATE = date(2026, 7, 27).isoformat()
MAX_EDITORIAL_ITEMS = 20
# Portões do PROTOCOLO-FONTES.md que dá para reaplicar por conta própria sobre a base.
MIN_BOOKS_PER_SOURCE = 3
G5_OVERLAP = 0.80
# Sobreposição só é evidência de cópia entre listas de tamanho parecido.
G5_MIN_LIST = 8


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
    "On Lisp": "Paul Graham",
    "Paradigms of Artificial Intelligence Programming": "Peter Norvig",
    "Pattern Hatching": "John Vlissides",
    "Patterns of Enterprise Application Architecture": "Martin Fowler",
    "Peopleware": "Tom DeMarco; Tim Lister",
    "Perfect Software": "Gerald M. Weinberg",
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
    "Software Engineering": "Ian Sommerville",
    "Software Engineering at Google": "Titus Winters; Tom Manshreck; Hyrum Wright",
    "Software Engineering: A Practitioner's Approach": "Roger S. Pressman; Bruce R. Maxim",
    "Software Engineering: Principles and Practice": "Hans van Vliet",
    "Software Engineering: Theory and Practice": "Shari Lawrence Pfleeger; Joanne M. Atlee",
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
    # Fontes acrescentadas depois da coleta inicial registram a própria data de acesso.
    access_date: str = ""
    # Idioma da página, em ISO 639-1. A maioria das fontes está em inglês.
    language: str = "en"


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
        books("Clean Code", "The Pragmatic Programmer", "Designing Data-Intensive Applications", "Software Engineering at Google", "The Software Architect's Handbook", "Object-Oriented Software Engineering Using UML, Patterns, and Java", "Structure and Interpretation of Computer Programs", "Working Effectively with Legacy Code", "Code", "Refactoring"),
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
    Source(
        "builtin",
        "Must-Read Books for Software Engineers",
        "Built In",
        "https://builtin.com/software-engineering-perspectives/best-software-engineering-books",
        "2023-05-24",
        "curadoria_editorial",
        "ordem_editorial",
        "Fundamentos, estilo de código, padrões, DevOps, segurança, front-end e gestão.",
        "Foram preservados os 18 livros e a ordem visual das seções da página.",
        books(
            "Clean Code", "The Mythical Man-Month", "A Philosophy of Software Design",
            "Code Complete", "Working Effectively with Legacy Code", "Design Patterns",
            "Head First Design Patterns", "Pro Git", "The DevOps Handbook",
            "The Web Application Hacker's Handbook", "CSS in Depth",
            "Inclusive Design Patterns", "You Don't Know JS Yet", "Rapid Development",
            "The Pragmatic Programmer", "Code", "The Algorithm Design Manual",
            "The C Programming Language",
        ),
    ),
    Source(
        "shapingsoftware",
        "Top 20 Best Software Engineering Books of All Time",
        "Shaping Software",
        "https://shapingsoftware.com/best-software-books/",
        "2024-01-12",
        "curadoria_especialista",
        "lista_numerada",
        "Agilidade, construção, design, segurança, requisitos, UX e gestão.",
        "A página numera os 20 livros, mas declara que eles não estão em ordem comparativa.",
        books(
            "Agile Project Management with Kanban",
            "Agile Software Development: Principles, Patterns, and Practices",
            "Clean Code", "Code Complete", "Design Patterns", "Designing Secure Software",
            "Head First Design Patterns", "Introduction to Algorithms",
            "Managing the Design Factory", "More Effective Agile",
            "Patterns of Enterprise Application Architecture", "Refactoring",
            "Requirements-led Project Management", "Scenarios, Stories, Use Cases",
            "Soft Skills", "Software Development Pearls", "The Design of Sites",
            "The Mythical Man-Month", "The Pragmatic Programmer",
            "Writing Effective Use Cases",
        ),
    ),
    Source(
        "gauravtiwari",
        "10 Best Books Every Programmer Must Read",
        "Gaurav Tiwari",
        "https://gauravtiwari.org/best-books-every-programmer-must-read/",
        "2026-06-23",
        "curadoria_individual",
        "ordem_editorial",
        "Código limpo, Java, Python, padrões, algoritmos e domínio.",
        "Foram usados os dez livros apresentados no corpo principal do artigo.",
        books(
            "Clean Code", "Effective Java", "The Mythical Man-Month", "Design Patterns",
            "Python Programming: An Introduction to Computer Science", "Code Complete",
            "Programming Pearls", "Domain-Driven Design", "Introduction to Algorithms",
            "Python Programming for the Absolute Beginner",
        ),
    ),
    Source(
        "techgig_2026",
        "Top Books Every Software Developer Should Read to Stay Relevant in 2026",
        "TechGig",
        "https://content.techgig.com/news/career-advice/essential-reads-for-software-developers-to-thrive-in-2026/articleshow/126227314.cms",
        "2025-12-29",
        "curadoria_editorial",
        "lista_numerada",
        "Práticas profissionais, código, complexidade, refatoração, domínio e arquitetura.",
        "A lista numerada contém seis recomendações voltadas ao crescimento para funções seniores.",
        books(
            "The Pragmatic Programmer", "Clean Code", "A Philosophy of Software Design",
            "Refactoring", "Domain-Driven Design", "Fundamentals of Software Architecture",
        ),
    ),
    Source(
        "programmingbooks_dev",
        "Programming Books — A Reading List for Software Craftsmanship",
        "ProgrammingBooks.dev",
        "https://www.programmingbooks.dev/",
        "",
        "curadoria_individual",
        "ordem_editorial",
        "Trilha de aprendiz a mestre sobre programação e engenharia de software.",
        "A página separa livros principais de leituras complementares; foram usados os 20 primeiros títulos principais.",
        books(
            "Apprenticeship Patterns", "The Art of Unit Testing", "Grokking Algorithms",
            "Grokking Simplicity", "The Object-Oriented Thought Process",
            "Small, Sharp Software Tools", "The Art of Agile Development", "Code",
            "Design Patterns", "Don't Make Me Think", "The Manga Guide to Databases",
            "The Pragmatic Programmer", "Refactoring", "Seven Languages in Seven Weeks",
            "System Design Interview", "Test-Driven Development: By Example",
            "Coders at Work", "Continuous Delivery", "Designing Data-Intensive Applications",
            "Domain-Driven Design",
        ),
    ),
    Source(
        "pragmatic_engineer_reading",
        "The Pragmatic Engineer's Bookshelf",
        "The Pragmatic Engineer",
        "https://blog.pragmaticengineer.com/my-reading-list/",
        "2024-12-16",
        "curadoria_especialista",
        "ordem_editorial",
        "Design, dados, legado, linguagens, confiabilidade e APIs.",
        "Foram usados somente os nove títulos principais da seção 'Software Engineering Books'.",
        books(
            "A Philosophy of Software Design", "Designing Data-Intensive Applications",
            "Tidy First?", "Working Effectively with Legacy Code", "C# in Depth",
            "JavaScript: The Good Parts", "Release It!", "Site Reliability Engineering",
            "Framework Design Guidelines",
        ),
    ),
    Source(
        "philosophical_geek",
        "The Effective Software Developer's Book List",
        "Ben Watson / Philosophical Geek",
        "https://www.philosophicalgeek.com/2007/11/21/books/",
        "2008-08-15",
        "curadoria_individual",
        "ordem_editorial",
        "Construção, criatividade, requisitos, testes, arquitetura e gestão.",
        "A lista é extensa; foram usados os 20 primeiros livros das seções introdutória e intermediária.",
        books(
            "Code Complete", "Conceptual Blockbusting", "Programming Pearls",
            "Facts and Fallacies of Software Engineering", "The Pragmatic Programmer",
            "Object-Oriented Design Heuristics", "UML Distilled",
            "Applying UML and Patterns", "Refactoring Workbook", "The Mythical Man-Month",
            "Introduction to Algorithms", "Software Configuration Management Patterns",
            "Software Creativity 2.0", "Testing Computer Software", "Rapid Development",
            "Software Requirements", "Manager's Handbook for Software Development",
            "Patterns of Enterprise Application Architecture",
            "Test-Driven Development: By Example", "Pragmatic Unit Testing in C# with NUnit",
        ),
    ),
    Source(
        "roscoe_bartlett",
        "Software Engineering Reading List — Most Recommended Books",
        "Roscoe A. Bartlett",
        "https://bartlettroscoe.github.io/reading-list/",
        "",
        "curadoria_especialista",
        "ranking_explicito",
        "Construção, legado, design orientado a objetos, domínio e Lean.",
        "Foram usados somente os cinco títulos da seção A.1, declarada em ordem de importância relativa.",
        books(
            "Code Complete", "Working Effectively with Legacy Code",
            "Agile Software Development: Principles, Patterns, and Practices",
            "Domain-Driven Design", "Implementing Lean Software Development",
        ),
    ),
    Source(
        "devto_xteam",
        "10 Essential Programming Books Every Developer Should Read",
        "X-Team / DEV Community",
        "https://dev.to/x-team/10-essential-programming-books-every-developer-should-read-3mmj",
        "2022-08-09",
        "curadoria_empresa",
        "ordem_editorial",
        "Prática profissional, construção, história, carreira e psicologia.",
        "Foram preservados os dez livros na ordem em que aparecem no artigo.",
        books(
            "The Pragmatic Programmer", "The Clean Coder", "Code Complete",
            "Coders at Work", "Clean Code", "The Mythical Man-Month",
            "The Art of Unix Programming", "Prefactoring",
            "The Psychology of Computer Programming", "So Good They Can't Ignore You",
        ),
    ),
    Source(
        "cornell_cs5150",
        "CS 5150 Software Engineering — Recommended Books",
        "Cornell University",
        "https://www.cs.cornell.edu/courses/cs5150/2025sp/references.html",
        "2025",
        "curadoria_academica",
        "ordem_editorial",
        "Engenharia em escala, embarcados, gestão de projetos e prática profissional.",
        "Foram usados os cinco itens da seção 'Books'; recursos online foram excluídos.",
        books(
            "Software Engineering at Google", "Better Embedded System Software",
            "The Mythical Man-Month", "Software Engineering", "The Pragmatic Programmer",
        ),
    ),
    Source(
        "teachyourselfcs",
        "Teach Yourself Computer Science — Recommended Books by Subject",
        "Teach Yourself CS",
        "https://teachyourselfcs.com/",
        "",
        "curadoria_curricular",
        "ordem_editorial",
        "Programação, arquitetura, algoritmos, matemática, sistemas, redes, bancos e linguagens.",
        "Foram usados os nove livros principais do resumo curricular; cursos e alternativas foram excluídos.",
        books(
            "Structure and Interpretation of Computer Programs",
            "Computer Systems: A Programmer's Perspective", "The Algorithm Design Manual",
            "Mathematics for Computer Science", "Operating Systems: Three Easy Pieces",
            "Computer Networking: A Top-Down Approach", "Readings in Database Systems",
            "Crafting Interpreters", "Designing Data-Intensive Applications",
        ),
    ),
    Source(
        "hackernoon_tanaka",
        "11 Books Every Software Developer Should Read",
        "Tanaka Mutakwa / HackerNoon",
        "https://hackernoon.com/11-books-every-software-developer-should-read",
        "2021-10-15",
        "curadoria_individual",
        "lista_numerada",
        "Carreira, entrevistas, produtividade, práticas ágeis e código.",
        "Os onze lugares numerados do artigo foram preservados.",
        books(
            "The Tech Resume Inside Out", "Cracking the Coding Interview",
            "Things They Don't Teach You in Software School", "Letters to a New Developer",
            "Soft Skills", "14 Habits of Highly Productive Developers",
            "Extreme Programming Explained", "Clean Code", "The Pragmatic Programmer",
            "Refactoring", "The Nature of Software Development",
        ),
    ),
    Source(
        "cornell_cs501",
        "CS 501 Software Engineering — Books and Readings",
        "Cornell University",
        "https://www.cs.cornell.edu/courses/cs501/2007sp/readings.html",
        "2007-01-05",
        "curadoria_academica",
        "ordem_editorial",
        "Engenharia de software, métodos formais, orientação a objetos, UML e arquitetura.",
        "A página contém dez livros; todos foram preservados na ordem publicada.",
        books(
            "The Mythical Man-Month", "Software Engineering",
            "Software Engineering: Theory and Practice",
            "An Introduction to Formal Specification and Z",
            "Object-Oriented Analysis and Design with Applications",
            "The Unified Modeling Language User Guide",
            "Using UML: Software Engineering with Objects and Components",
            "Object-Oriented Software Engineering Using UML, Patterns, and Java",
            "Software Architecture: Perspectives on an Emerging Discipline",
            "Design Patterns",
        ),
    ),
    Source(
        "unibo_software_engineering",
        "Software Engineering 2025/2026 — Readings and Bibliography",
        "University of Bologna",
        "https://www.unibo.it/en/study/course-units-transferable-skills-moocs/course-unit-catalogue/course-unit/2025/517125",
        "2025",
        "curadoria_academica",
        "ordem_editorial",
        "Engenharia, práticas, Git, orientação a objetos, UML, testes e sistemas distribuídos.",
        "Somente livros foram considerados; artigos e documentação foram excluídos, e a lista foi limitada aos 20 primeiros.",
        books(
            "Software Engineering: A Practitioner's Approach", "Software Engineering",
            "The Mythical Man-Month", "The Pragmatic Programmer", "Clean Code", "Pro Git",
            "Version Control with Git", "Python Object-Oriented Programming",
            "Design Patterns", "Effective Python", "Clean Architecture", "UML Distilled",
            "Applying UML and Patterns", "Test-Driven Development: By Example",
            "The Art of Software Testing", "xUnit Test Patterns", "Continuous Delivery",
            "Designing Data-Intensive Applications",
            "Distributed Systems: Principles and Paradigms", "RESTful Web APIs",
        ),
    ),
    Source(
        "hassan_agmir",
        "The Best 10 Programming Books",
        "Hassan Agmir",
        "https://hassanagmir.com/blogs/the-best-10-programming-books",
        "",
        "curadoria_individual",
        "lista_numerada",
        "Prática, código, construção, design, algoritmos, fundamentos e dados.",
        "Foram preservados os dez lugares numerados pelo autor.",
        books(
            "The Pragmatic Programmer", "Clean Code", "Code Complete", "Refactoring",
            "Design Patterns", "Introduction to Algorithms",
            "Structure and Interpretation of Computer Programs",
            "Designing Data-Intensive Applications", "You Don't Know JS Yet",
            "Programming Pearls",
        ),
    ),
    Source(
        "uppsala_se_fundamentals",
        "Software Engineering Fundamentals — Reading List",
        "Uppsala University",
        "https://www.uu.se/en/study/reading-list?query=33338",
        "2026",
        "curadoria_academica",
        "ordem_editorial",
        "Fundamentos de computação e técnicas de estudo do curso de engenharia de software.",
        "Foram preservados os três livros obrigatórios da lista válida para 2026.",
        books(
            "Code", "Computer Science: An Overview", "Att studera på högskolan",
        ),
    ),
    Source(
        "toronto_csc444",
        "CSC444 Software Engineering — Books and Readings",
        "University of Toronto",
        "https://www.cs.toronto.edu/~sme/CSC444F/books.html",
        "",
        "curadoria_academica",
        "ordem_editorial",
        "Engenharia, projeto de programas, testes, requisitos, design e métodos formais.",
        "Foram usados os 20 primeiros livros únicos; artigos, capítulos avulsos e uma coletânea genérica foram excluídos.",
        books(
            "Software Engineering: Principles and Practice", "Program Development in Java",
            "Software Architecture: Perspectives on an Emerging Discipline",
            "Software Engineering: Theory and Practice",
            "Software Engineering: A Practitioner's Approach", "Software Engineering",
            "Software Engineering with Abstractions", "Programming from First Principles",
            "Software Testing Techniques", "The Complete Guide to Software Testing",
            "Software Product Assurance", "Handbook of Software Quality Assurance",
            "Handbook of Walkthroughs, Inspections, and Technical Reviews",
            "Software Requirements: Analysis and Specification",
            "Mastering the Requirements Process",
            "Requirements Engineering and Rapid Development", "Exploring Requirements",
            "Software Requirements and Specifications", "Software Design",
            "Logic in Computer Science",
        ),
    ),
    Source(
        "jasonroell",
        "12 Most Influential Books Every Software Engineer Needs to Read",
        "Jason Roell / The Curious Programmer",
        "https://jasonroell.com/2015/03/16/12-most-infuential-books-every-software-engineer-needs-to-read/",
        "2015-03-16",
        "curadoria_individual",
        "ranking_explicito",
        "Construção, fundamentos, algoritmos, design, história e legado.",
        "A página exibe os itens do 12º ao 1º; o CSV os reorganiza do 1º ao 12º lugar.",
        books(
            "Code Complete", "The Pragmatic Programmer",
            "Structure and Interpretation of Computer Programs", "Introduction to Algorithms",
            "Clean Code", "Refactoring", "The Art of Computer Programming", "Code",
            "Programming Pearls", "Design Patterns", "The Mythical Man-Month",
            "Working Effectively with Legacy Code",
        ),
    ),
    Source(
        "cmu_mary_shaw",
        "Software Engineering Book Recommendations",
        "Mary Shaw / Carnegie Mellon University",
        "https://www.cs.cmu.edu/~shaw/Edparts/sebook.htm",
        "",
        "curadoria_academica",
        "ordem_editorial",
        "Arquitetura, requisitos, design, UML e engenharia de sistemas.",
        "Foram preservadas as nove recomendações da página, na ordem das categorias.",
        books(
            "Software Architecture: Perspectives on an Emerging Discipline",
            "Pattern-Oriented Software Architecture", "Software Requirements and Specifications",
            "Bringing Design to Software", "UML Distilled", "UML Toolkit",
            "The Art of Systems Architecting", "Design Paradigms", "The Tender Ship",
        ),
    ),
    # Fontes acrescentadas em 2026-07-26.
    Source(
        "codinghorror",
        "Recommended Reading for Developers",
        "Jeff Atwood / Coding Horror",
        "https://blog.codinghorror.com/recommended-reading-for-developers/",
        "",
        "curadoria_especialista",
        "ordem_editorial",
        "Construção de software, pessoas, usabilidade e apresentação de informação.",
        "Lista clássica do autor. Dois itens promocionais inseridos na página (livros vendidos pelo próprio blog) foram desconsiderados por não fazerem parte da recomendação original.",
        books(
            "Code Complete", "The Mythical Man-Month", "Don't Make Me Think", "Rapid Development",
            "Peopleware", "The Design of Everyday Things", "About Face",
            "The Inmates Are Running the Asylum", "Programming Pearls", "The Pragmatic Programmer",
            "Designing Web Usability", "The Visual Display of Quantitative Information",
            "Visual Explanations", "Envisioning Information", "Beautiful Evidence",
            "Regular Expressions Cookbook",
        ),
        LATEST_ACCESS_DATE,
    ),
    Source(
        "devto_javinpaul",
        "10 Software Engineering Books Developers Should Read",
        "DEV Community / javinpaul (somadevtoo)",
        "https://dev.to/somadevtoo/10-software-engineering-books-developers-should-read-in-2025-2kfk",
        "2025-01-14",
        "curadoria_individual",
        "lista_numerada",
        "Conselhos gerais, código, arquitetura, padrões e algoritmos.",
        "A lista é numerada de 1 a 10 e agrupada em cinco categorias; a ordem numérica foi preservada.",
        books(
            "The Pragmatic Programmer", "Code Complete", "Clean Code", "Refactoring",
            "Designing Data-Intensive Applications", "System Design Interview", "Design Patterns",
            "Domain-Driven Design", "Introduction to Algorithms", "Cracking the Coding Interview",
        ),
        LATEST_ACCESS_DATE,
    ),
    Source(
        "hackr",
        "The 10 Best Programming Books for Beginners & Pros",
        "hackr.io",
        "https://hackr.io/blog/best-programming-books",
        "2025-01-30",
        "curadoria_comercial",
        "lista_numerada",
        "Clássicos de programação, algoritmos e padrões de projeto.",
        "Página com links de afiliado; a numeração de 1 a 10 da própria fonte foi mantida.",
        books(
            "Clean Code", "Introduction to Algorithms",
            "Structure and Interpretation of Computer Programs", "The Clean Coder", "Code Complete",
            "Design Patterns", "The Pragmatic Programmer", "Head First Design Patterns",
            "Refactoring", "The Art of Computer Programming",
        ),
        LATEST_ACCESS_DATE,
    ),
    Source(
        "simplilearn",
        "Top 5 Best Coding Books You Must Read",
        "Simplilearn",
        "https://www.simplilearn.com/tutorials/programming-tutorial/best-coding-books-you-must-read",
        "2025-11-11",
        "curadoria_comercial",
        "lista_numerada",
        "Escrita de código, raciocínio de programação e conduta profissional.",
        "Lista curta de cinco itens numerados, voltada a quem está começando.",
        books(
            "Clean Code", "Think Like a Programmer", "The Clean Coder", "The Pragmatic Programmer",
            "Code Complete",
        ),
        LATEST_ACCESS_DATE,
    ),
    Source(
        "freecodecamp",
        "Best Computer Programming Books to Help You Learn to Code",
        "freeCodeCamp",
        "https://www.freecodecamp.org/news/best-computer-programming-books-to-help-you-learn-to-code/",
        "2020-01-28",
        "curadoria_editorial",
        "ordem_editorial",
        "Aprendizado de programação, carreira, algoritmos e linguagens específicas.",
        "A fonte lista cerca de 40 títulos por assunto; foram usados os 20 primeiros para comparabilidade.",
        books(
            "Automate the Boring Stuff with Python",
            "Structure and Interpretation of Computer Programs", "Clean Code", "Code",
            "Don't Make Me Think", "Programming Pearls", "The Pragmatic Programmer",
            "The Self-Taught Programmer", "You Don't Know JS Yet", "Soft Skills",
            "Introduction to Algorithms", "Cracking the Coding Interview",
            "The C Programming Language", "A Book on C", "Programming Interviews Exposed",
            "Head First Java", "Effective Java", "Eloquent JavaScript", "JavaScript: The Good Parts",
            "JavaScript and jQuery: Interactive Front-End Web Development",
        ),
        LATEST_ACCESS_DATE,
    ),
    Source(
        "bookauthority",
        "10 Software Engineering Books Top Experts Recommend",
        "BookAuthority",
        "https://bookauthority.org/books/best-software-engineering-books",
        "",
        "ranking_recomendacoes_especialistas",
        "ranking_explicito",
        "Ofício, entrega, testes, agilidade e engenharia em escala.",
        "Ranking montado a partir de recomendações públicas de especialistas; a ordem exibida pela página foi preservada.",
        books(
            "Clean Craftsmanship", "Modern Software Engineering", "Accelerate", "Clean Code",
            "Explore It!", "The Mythical Man-Month", "Introduction to Software Testing",
            "The Agile Samurai", "Software Engineering at Google", "The Missing README",
        ),
        LATEST_ACCESS_DATE,
    ),
    Source(
        "hackreactor",
        "7 great books for software engineers to read",
        "Hack Reactor",
        "https://www.hackreactor.com/resources/7-great-books-for-software-engineers-to-read/",
        "2022-09-13",
        "curadoria_empresa",
        "ordem_editorial",
        "Entrevistas técnicas, qualidade de código, design e usabilidade.",
        "Foram usadas as sete recomendações principais; as sugestões extras de nicho no fim do artigo ficaram de fora.",
        books(
            "Cracking the Coding Interview", "Clean Code", "The Pragmatic Programmer",
            "A Philosophy of Software Design", "Don't Make Me Think", "The Mythical Man-Month",
            "Head First Design Patterns",
        ),
        LATEST_ACCESS_DATE,
    ),
    Source(
        "medium_dootrix",
        "The ultimate developer's reading list",
        "Dootrix / The Reading Room (Medium)",
        "https://medium.com/the-reading-room/the-ultimate-developers-reading-list-ec35fd2280a1",
        "2017-07-10",
        "curadoria_equipe",
        "ordem_editorial",
        "Fundamentos, padrões, usabilidade, dados e cultura de software.",
        "Lista montada pela equipe da consultoria a partir das indicações dos próprios desenvolvedores.",
        books(
            "Code", "Head First Design Patterns", "Don't Make Me Think", "Rocket Surgery Made Easy",
            "JavaScript: The Good Parts", "The Visual Display of Quantitative Information",
            "Clean Code", "The Lean Startup", "Code Complete", "Joel on Software", "Code Craft",
            "The Pragmatic Programmer", "Seven Databases in Seven Weeks", "Hackers & Painters",
            "Design Patterns", "The Cathedral and the Bazaar", "The Art of Unix Programming",
        ),
        LATEST_ACCESS_DATE,
    ),
    Source(
        "bebee",
        "Books Every Software Engineer Should Read in 2026",
        "beBee Editorial",
        "https://bebee.com/gb/blog/bebee-editorial/books-every-software-engineer-should-read-in-2026",
        "",
        "curadoria_editorial",
        "ordem_editorial",
        "Código, sistemas distribuídos, infraestrutura, aprendizado de máquina e carreira.",
        "Lista editorial curta com ênfase em temas atuais de plataforma e liderança técnica.",
        books(
            "Clean Code", "System Design Interview", "Designing Data-Intensive Applications",
            "Hands-On Machine Learning", "Kubernetes in Action", "The Manager's Path",
            "Staff Engineer", "Accelerate",
        ),
        LATEST_ACCESS_DATE,
    ),
    Source(
        "umd_cmsc435",
        "CMSC 435 Software Engineering — Textbooks",
        "James Purtilo / University of Maryland",
        "https://seam.cs.umd.edu/purtilo/435/textbooks.html",
        "",
        "curadoria_academica",
        "ordem_editorial",
        "Livros-texto de engenharia de software para curso de graduação.",
        "A página indica livros de apoio ao projeto da disciplina, sem eleger um único obrigatório.",
        books(
            "Software Engineering: A Practitioner's Approach", "Software Engineering",
            "Software Engineering: Theory and Practice",
            "Object-Oriented and Classical Software Engineering",
        ),
        LATEST_ACCESS_DATE,
    ),
    Source(
        "calpoly_cpe205",
        "CPE 205 Software Engineering I — Syllabus",
        "John Dalbey / California Polytechnic State University",
        "https://users.csc.calpoly.edu/~jdalbey/205/syllabus.html",
        "2004",
        "curadoria_academica",
        "ordem_editorial",
        "Processo, planejamento e sobrevivência de projetos de software em equipe.",
        "Foram usados os dois livros indicados no programa; o guia online de projetos em grupo não foi contado como livro.",
        books("Project-Based Software Engineering", "Software Project Survival Guide"),
        LATEST_ACCESS_DATE,
    ),
    Source(
        "impulso",
        "6 livros que são obrigatórios para devs",
        "Impulso",
        "https://blog.impulso.team/6-livros-que-devs-precisam-ler-ctbp/",
        "2022-12-02",
        "curadoria_empresa",
        "ordem_editorial",
        "Qualidade de código, legado, arquitetura, gestão e algoritmos.",
        "Fonte em português; os títulos das edições brasileiras foram mapeados para o título canônico.",
        books(
            "Clean Code", "The Pragmatic Programmer", "Working Effectively with Legacy Code",
            "The Mythical Man-Month", "Clean Architecture", "Grokking Algorithms",
        ),
        LATEST_ACCESS_DATE,
        "pt",
    ),
    Source(
        "geekhunter",
        "10 melhores livros de programação para desenvolvedores",
        "GeekHunter",
        "https://www.geekhunter.com/pt/blog/10-livros-de-programacao-que-vao-mudar-sua-carreira/",
        "2025-03-20",
        "curadoria_empresa",
        "lista_numerada",
        "Código limpo, legado, padrões, fundamentos de hardware e entrevistas.",
        "Fonte em português; os títulos das edições brasileiras foram mapeados para o título canônico.",
        books(
            "Clean Code", "Working Effectively with Legacy Code", "Design Patterns", "Refactoring",
            "But How Do It Know?", "Domain-Driven Design", "The Mythical Man-Month",
            "Introduction to Algorithms", "The Pragmatic Programmer", "Cracking the Coding Interview",
        ),
        LATEST_ACCESS_DATE,
        "pt",
    ),
    Source(
        "devto_marcosplusplus",
        "10 Livros que Todo(a) Programador(a) deveria ler",
        "DEV Community / Marcos (marcosplusplus)",
        "https://dev.to/marcosplusplus/10-livros-que-todoa-programadora-deveria-ler-26db",
        "2024-07-28",
        "curadoria_individual",
        "lista_numerada",
        "Boas práticas, arquitetura, lógica de programação e algoritmos.",
        "Fonte em português, com títulos do mercado brasileiro; livros publicados apenas em português mantêm o título original como canônico.",
        books(
            "Clean Code", "Clean Architecture", "Refactoring", "Grokking Algorithms",
            "Becoming a Better Programmer", "Algoritmos e Lógica da Programação",
            "The Pragmatic Programmer",
            "Algoritmos: Lógica para Desenvolvimento de Programação de Computadores",
            "Introduction to Algorithms", "Aprenda Programação Orientada a Objetos em 21 Dias",
        ),
        LATEST_ACCESS_DATE,
        "pt",
    ),
    # Segunda rodada de fontes acrescentadas em 2026-07-26, até completar 100.
    Source(
        "amigoscode",
        "9 Books Every Software Engineer Should Read (Seriously)",
        "Amigoscode",
        "https://blog.amigoscode.com/p/9-books-every-software-engineer-should",
        "",
        "curadoria_individual",
        "lista_numerada",
        "Qualidade de código, arquitetura, bancos de dados, sistemas distribuídos e DevOps.",
        "Lista numerada de nove itens, com ênfase no que o autor considera leitura obrigatória.",
        books(
            "Clean Code", "The Pragmatic Programmer", "Software Engineering at Google",
            "Head First Design Patterns", "Learning SQL", "Clean Architecture",
            "Designing Distributed Systems", "The DevOps Handbook", "Code Complete",
        ),
        LATEST_ACCESS_DATE,
    ),
    Source(
        "pasksoftware",
        "Best Software Engineer Books — Build Your Personal Library",
        "Bartłomiej Żyliński / Pask Software",
        "https://pasksoftware.com/software-engineer-books/",
        "",
        "curadoria_individual",
        "lista_numerada",
        "Ofício, carreira, entrevistas de system design e padrões de projeto.",
        "O autor apresenta os livros em ordem de colocação e destaca qual leria primeiro.",
        books(
            "The Software Craftsman", "The Clean Coder", "The Software Engineer's Guidebook",
            "System Design Interview", "The Mythical Man-Month", "The Staff Engineer's Path",
            "Design Patterns", "The Pragmatic Programmer",
        ),
        LATEST_ACCESS_DATE,
    ),
    Source(
        "codingfearlessly",
        "Recommended Software Engineering Books",
        "Mindaugas Mozūras / Coding Fearlessly",
        "https://codingfearlessly.com/recommended-software-engineering-books",
        "",
        "curadoria_individual",
        "ordem_editorial",
        "Trilha por estágio de carreira: início, evolução, sistemas e gestão.",
        "A página organiza as indicações em cinco estágios de carreira; a ordem de exibição foi preservada.",
        books(
            "The Effective Engineer", "The Missing README", "The Pragmatic Programmer", "Peopleware",
            "Code Complete", "The Elements of Style", "Thinking in Systems",
            "Fundamentals of Software Architecture", "Learning Domain-Driven Design",
            "The Manager's Path", "High Output Management", "The Five Dysfunctions of a Team",
            "Scaling Teams", "Team Topologies", "Lean Enterprise",
        ),
        LATEST_ACCESS_DATE,
    ),
    Source(
        "medium_javinpaul",
        "12 Must Read Books for Software Engineers and Developers",
        "javinpaul / Javarevisited (Medium)",
        "https://medium.com/javarevisited/12-must-read-books-for-software-engineers-and-developers-27da9f88b19e",
        "2025-02-11",
        "curadoria_individual",
        "lista_numerada",
        "Fundamentos, design, ofício, algoritmos e história da programação.",
        "Mesmo autor da fonte `devto_javinpaul`, em publicação e lista distintas; há sobreposição parcial de títulos.",
        books(
            "System Design Interview", "Software Engineering at Google", "Programming Pearls",
            "Design Patterns", "The Mythical Man-Month", "Clean Code", "Refactoring",
            "The Design of Everyday Things", "Effective Java", "The Clean Coder",
            "Domain-Driven Design", "Coders at Work",
        ),
        LATEST_ACCESS_DATE,
    ),
    Source(
        "pragmatic_engineer_holiday",
        "Holiday Book Recommendations for Software Engineers, Engineering Managers and Product Managers",
        "Gergely Orosz / The Pragmatic Engineer",
        "https://blog.pragmaticengineer.com/holiday-tech-book-recommendations/",
        "",
        "curadoria_especialista",
        "ordem_editorial",
        "Carreira em engenharia, entrevistas e engenharia de software.",
        "A página reúne cerca de 112 livros em oito seções; foram usados os 20 primeiros. Mesmo autor da fonte `pragmatic_engineer_reading`, em página distinta.",
        books(
            "The Software Engineer's Guidebook", "The Staff Engineer's Path", "Staff Engineer",
            "Building a Career in Software", "The Effective Engineer", "The Pragmatic Programmer",
            "The Software Craftsman", "The Passionate Programmer", "The Missing README",
            "Growing as a Mobile Engineer", "Communication for Engineers", "System Design Interview",
            "Grokking Algorithms", "Cracking the Coding Interview",
            "A Common-Sense Guide to Data Structures and Algorithms", "Tidy First?",
            "A Philosophy of Software Design", "Designing Data-Intensive Applications",
            "The Art of Doing Science and Engineering", "Effective Software Testing",
        ),
        LATEST_ACCESS_DATE,
    ),
    Source(
        "codeforest",
        "The Ultimate List of Best Development Books You Must Read",
        "Zvonko Biškup / CodeForest",
        "https://www.codeforest.net/9-best-development-books",
        "2025-08-29",
        "curadoria_individual",
        "lista_numerada",
        "Refatoração, entrega contínua, legado e arquitetura de aplicações.",
        "Lista de nove itens numerados; a recomendação extra que aparece no FAQ não foi contada.",
        books(
            "Refactoring", "Clean Code", "The Pragmatic Programmer", "Accelerate",
            "The Phoenix Project", "Working Effectively with Legacy Code",
            "Patterns of Enterprise Application Architecture", "Monolith to Microservices",
            "Extreme Programming Explained",
        ),
        LATEST_ACCESS_DATE,
    ),
    Source(
        "thepower",
        "10 mejores libros de programación para aprender",
        "The Power Education",
        "https://thepower.education/blog/tech/10-libros-de-programacion",
        "",
        "curadoria_comercial",
        "lista_numerada",
        "Clássicos de construção de software, algoritmos e fundamentos.",
        "Fonte em espanhol. Lista numerada de dez itens mais três indicações de bônus, todas mantidas na ordem da página.",
        books(
            "Clean Code", "The Mythical Man-Month", "The Pragmatic Programmer", "Code Complete",
            "The Art of Computer Programming", "Programming Pearls", "Code",
            "Introduction to Algorithms", "Refactoring", "Design Patterns",
            "Automate the Boring Stuff with Python", "Eloquent JavaScript", "Grokking Algorithms",
        ),
        LATEST_ACCESS_DATE,
        "es",
    ),
    Source(
        "crehana",
        "Los 10 mejores libros de programación",
        "Crehana",
        "https://www.crehana.com/blog/transformacion-digital/libros-de-programacion/",
        "",
        "curadoria_comercial",
        "lista_numerada",
        "Boas práticas, front-end, padrões, algoritmos e carreira.",
        "Fonte em espanhol; edições em espanhol foram mapeadas para o título canônico.",
        books(
            "Clean Code", "El gran libro de HTML5, CSS3 y JavaScript", "Design Patterns",
            "Effective Java", "The Pragmatic Programmer", "Code", "Introduction to Algorithms",
            "Fluent Python", "Androids", "Soft Skills",
        ),
        LATEST_ACCESS_DATE,
        "es",
    ),
    Source(
        "aprenderbigdata",
        "Mejores Libros de Programación y Desarrollo",
        "Aprender BigData",
        "https://aprenderbigdata.com/mejores-libros-de-programacion/",
        "2024-07-29",
        "curadoria_individual",
        "ordem_editorial",
        "Programação geral, algoritmos, entrevistas e linguagens da JVM.",
        "Fonte em espanhol; foi usada a seção de programação e desenvolvimento de software.",
        books(
            "The Pragmatic Programmer", "The Art of Computer Programming",
            "Cracking the Coding Interview", "Clean Code", "Code Complete",
            "Head First Design Patterns", "Programming in Scala", "Java in a Nutshell",
        ),
        LATEST_ACCESS_DATE,
        "es",
    ),
    Source(
        "dinahosting",
        "Selección de libros de programación",
        "Dinahosting",
        "https://dinahosting.com/blog/libros-de-programacion/",
        "",
        "curadoria_empresa",
        "ordem_editorial",
        "Clássicos, livros específicos de tecnologia e novidades recentes.",
        "Fonte em espanhol, com 24 títulos divididos em clássicos, específicos e atualização de 2025; foram usados os 20 primeiros.",
        books(
            "Clean Code", "The Clean Coder", "Clean Craftsmanship", "The Pragmatic Programmer",
            "El libro negro del Programador", "Dive into Design Patterns",
            "Head First Design Patterns", "Continuous Delivery", "Refactoring",
            "Test-Driven Development: By Example", "The Phoenix Project",
            "Automate the Boring Stuff with Python", "JavaScript: The Good Parts", "The Tangled Web",
            "Git & GitHub desde cero", "The Web Application Hacker's Handbook",
            "Designing Data-Intensive Applications", "Aprende SQL en un fin de semana",
            "The Coming Wave", "Algorithms to Live By",
        ),
        LATEST_ACCESS_DATE,
        "es",
    ),
    Source(
        "findjobit",
        "Mejores libros para programadores",
        "FindJobIT",
        "https://findjobit.com/pages/articles/mejores-libros-para-programadores",
        "",
        "curadoria_empresa",
        "ordem_editorial",
        "Sistemas distribuídos, dados, aprendizado de máquina, DevOps e algoritmos.",
        "Fonte em espanhol, organizada por área técnica; a ordem de exibição foi preservada.",
        books(
            "Distributed Systems for Fun and Profit", "Understanding Distributed Systems",
            "Designing Data-Intensive Applications", "Fundamentals of Data Engineering",
            "Streaming Systems", "Machine Learning", "The 100-Page Machine Learning Book",
            "Machine Learning: The Art and Science of Algorithms that Make Sense of Data",
            "Deep Learning", "The Phoenix Project", "Lean DevOps", "Docker in Action",
            "Cloud Native DevOps with Kubernetes", "Designing Machine Learning Systems",
            "Grokking Algorithms", "Introduction to Algorithms",
        ),
        LATEST_ACCESS_DATE,
        "es",
    ),
    Source(
        "superdevacademy",
        "Books Every Programmer Should Read",
        "Superdev Academy",
        "https://www.superdevacademy.com/en/blogs/books-every-programmer-should-read-2025",
        "",
        "curadoria_empresa",
        "lista_numerada",
        "Boas práticas, JavaScript, DevOps, padrões e entrevistas.",
        "Lista numerada de dez itens voltada a quem quer sair do nível iniciante.",
        books(
            "Clean Code", "The Pragmatic Programmer", "You Don't Know JS Yet", "The Phoenix Project",
            "Refactoring", "Design Patterns", "JavaScript: The Good Parts",
            "Cracking the Coding Interview", "The Mythical Man-Month",
            "Artificial Intelligence: A Guide to Intelligent Systems",
        ),
        LATEST_ACCESS_DATE,
    ),
    Source(
        "mindsers",
        "La liste de livres à lire d'un développeur sénior",
        "Nathanaël Cherrier / Mindsers Blog",
        "https://mindsers.blog/readings/",
        "",
        "curadoria_individual",
        "ordem_editorial",
        "Ofício, algoritmos, DDD, DevOps e documentação.",
        "Fonte em francês. Foi usada a seção de programação e computação; a seção de finanças pessoais ficou de fora.",
        books(
            "The Pragmatic Programmer", "Clean Code", "Code Complete", "The Clean Coder",
            "The Algorithm Design Manual", "Regular Expressions Cookbook", "Domain-Driven Design",
            "Effective DevOps", "The Software Craftsman", "Test-Driven Development: By Example",
            "Grokking Algorithms", "Docs Like Code", "Technically Wrong", "Accelerate",
        ),
        LATEST_ACCESS_DATE,
        "fr",
    ),
    Source(
        "comment_devenir_developpeur",
        "Top 5 livres à lire pour tout développeur peu importe le niveau",
        "Comment Devenir Développeur",
        "https://www.comment-devenir-developpeur.com/blog/top-5-livres-a-lire-pour-tout-developpeurs-peu-importe-le-niveau",
        "",
        "curadoria_individual",
        "lista_numerada",
        "Qualidade de código, carreira, entrevistas e padrões de projeto.",
        "Fonte em francês, com cinco indicações numeradas.",
        books(
            "Clean Code", "The Complete Software Developer's Career Guide",
            "Cracking the Coding Interview", "Head First Design Patterns", "Design Patterns",
        ),
        LATEST_ACCESS_DATE,
        "fr",
    ),
    Source(
        "adatechschool",
        "Top 5 des livres pour développeur web",
        "Ada Tech School",
        "https://blog.adatechschool.fr/top-5-livres-developpeur/",
        "",
        "curadoria_empresa",
        "lista_numerada",
        "Método, cultura de software, carreira e foco no trabalho.",
        "Fonte em francês, com cinco indicações numeradas.",
        books(
            "Clean Code", "Joel on Software", "The Art of Unix Programming", "Soft Skills",
            "Deep Work",
        ),
        LATEST_ACCESS_DATE,
        "fr",
    ),
    Source(
        "taoxie_illinois",
        "Software Engineering Readings",
        "Tao Xie / University of Illinois",
        "https://taoxie.cs.illinois.edu/sereading.htm",
        "",
        "curadoria_academica",
        "ordem_editorial",
        "Modularidade, requisitos, arquitetura, estimativa e padrões.",
        "Página de leituras de pesquisa em engenharia de software; foram contados apenas os livros, não os artigos nem a coletânea de manuscritos de Dijkstra.",
        books(
            "The Mythical Man-Month", "Software Fundamentals: Collected Papers",
            "Software Product-Line Engineering",
            "Software Architecture: Perspectives on an Emerging Discipline",
            "Software Engineering Economics", "Software Cost Estimation with COCOMO II",
            "Design Rules: The Power of Modularity", "Software Requirements and Specifications",
            "Problem Frames and Methods", "Design Patterns", "UML Distilled", "Refactoring",
            "Analysis Patterns", "Pattern-Oriented Software Architecture", "Code Complete",
            "High Tech Start Up",
        ),
        LATEST_ACCESS_DATE,
    ),
    Source(
        "holasoymalva",
        "Awesome Programming Books — Software Engineering & Architecture",
        "holasoymalva / GitHub",
        "https://github.com/holasoymalva/awesome-programming-books",
        "",
        "curadoria_open_source",
        "ordem_editorial",
        "Padrões de projeto, arquitetura, sistemas distribuídos e confiabilidade.",
        "Repositório de livros de acesso livre; foi usada a seção de engenharia de software e arquitetura.",
        books(
            "Design Patterns Explained", "Game Programming Patterns", "Dive into Design Patterns",
            "Software Architecture Patterns", "Clean Architecture",
            "The Architecture of Open Source Applications",
            "Distributed Systems: Principles and Paradigms",
            "Designing Data-Intensive Applications", "Site Reliability Engineering",
        ),
        LATEST_ACCESS_DATE,
    ),
    Source(
        "inquisition",
        "Quelques bons livres de génie logiciel",
        "inquisition.ca",
        "https://inquisition.ca/fr/info/biblio_info.htm",
        "",
        "curadoria_individual",
        "ordem_editorial",
        "Construção, processo, sistemas operacionais, redes, banco de dados e UML.",
        "Fonte em francês, com 39 títulos de bibliografia; foram usados os 20 primeiros para comparabilidade.",
        books(
            "Code Complete", "The C++ Programming Language",
            "Object-Oriented Analysis and Design with Applications", "Structured Computer Organization",
            "Modern Operating Systems", "Computer Networks", "Software Project Survival Guide",
            "Rapid Development", "Distributed Systems: Principles and Paradigms",
            "Professional Software Development", "Operating Systems: Design and Implementation",
            "An Embedded Software Primer", "Doing Hard Time", "Fundamentals of Database Systems",
            "Designing the User Interface", "Programming Pearls", "More Programming Pearls",
            "Principles of Software Engineering Management", "The Mythical Man-Month",
            "Object Solutions",
        ),
        LATEST_ACCESS_DATE,
        "fr",
    ),
    Source(
        "geekandjob",
        "11 Libri che Ogni Programmatore Dovrebbe Conoscere (e Leggere)",
        "Geek&Job",
        "https://blog.geekandjob.com/libri-per-programmatori/",
        "",
        "curadoria_empresa",
        "lista_numerada",
        "Fundamentos de computação, algoritmos, ofício e carreira.",
        "Fonte em italiano; a última indicação é apresentada como bônus e foi mantida na ordem da página.",
        books(
            "Code", "The Pragmatic Programmer", "Introduction to Algorithms",
            "The Art of Computer Programming", "Algorithms to Live By", "Code Complete", "Clean Code",
            "The Complete Software Developer's Career Guide", "Cracking the Coding Interview",
            "The Mythical Man-Month", "Soft Skills",
        ),
        LATEST_ACCESS_DATE,
        "it",
    ),
    Source(
        "laramind",
        "8 libri che uno sviluppatore web non può non aver letto",
        "LaraMind",
        "https://www.laramind.com/blog/8-libri-che-uno-sviluppatore-web-non-puo-non-aver-letto/",
        "",
        "curadoria_empresa",
        "ordem_editorial",
        "Boas práticas, refatoração, equipes, padrões e design de software.",
        "Fonte em italiano, com oito indicações em ordem editorial.",
        books(
            "The Pragmatic Programmer", "Refactoring", "Code Complete", "Peopleware",
            "Head First Design Patterns", "Clean Code", "Working Effectively with Legacy Code",
            "A Philosophy of Software Design",
        ),
        LATEST_ACCESS_DATE,
        "it",
    ),
    Source(
        "devto_sandordargo",
        "8 books every junior developer should read",
        "DEV Community / Sandor Dargo",
        "https://dev.to/sandordargo/8-books-every-junior-developer-should-read--4p5h",
        "",
        "curadoria_individual",
        "lista_numerada",
        "Construção de software, profissionalismo, testes e legado.",
        "Lista numerada de oito itens voltada a pessoas em início de carreira.",
        books(
            "Code Complete", "The Software Craftsman", "Clean Code",
            "Growing Object-Oriented Software, Guided by Tests", "The Clean Coder", "Refactoring",
            "Working Effectively with Legacy Code", "The Complete Software Developer's Career Guide",
        ),
        LATEST_ACCESS_DATE,
    ),
    Source(
        "pesto",
        "Top 10 Books Every Developer Should Read",
        "Pesto Tech",
        "https://www.pesto.tech/resources/top-10-books-every-developer-should-read-in-2024",
        "",
        "curadoria_empresa",
        "lista_numerada",
        "Clássicos de código, design, algoritmos e entrevistas.",
        "Lista numerada de dez itens, com ano de edição indicado para cada livro.",
        books(
            "Clean Code", "The Pragmatic Programmer", "Design Patterns", "Code Complete",
            "The Mythical Man-Month", "Refactoring", "You Don't Know JS Yet",
            "Cracking the Coding Interview", "The Art of Computer Programming",
            "Structure and Interpretation of Computer Programs",
        ),
        LATEST_ACCESS_DATE,
    ),
    Source(
        "medium_mcrcodes",
        "10 Books Every Junior Developer Needs To Read",
        "Manchester Codes (Medium)",
        "https://medium.com/@MCRcodes/10-books-every-junior-developer-needs-to-read-42953d1d5889",
        "2018-06-18",
        "curadoria_empresa",
        "lista_numerada",
        "Design orientado a objetos, aprendizado, JavaScript e fundamentos.",
        "Lista numerada de dez itens produzida por uma escola de programação.",
        books(
            "Practical Object-Oriented Design in Ruby", "Refactoring", "Apprenticeship Patterns",
            "You Don't Know JS Yet", "JavaScript: The Good Parts", "Domain-Driven Design",
            "Design Patterns", "Clean Code", "The Imposter's Handbook",
            "The Nature of Software Development",
        ),
        LATEST_ACCESS_DATE,
    ),
    Source(
        "profile_es",
        "10 libros esenciales para desarrolladores y programadores",
        "Profile Software Services",
        "https://profile.es/blog/libros-esenciales-para-desarrolladores-y-programadores/",
        "",
        "curadoria_empresa",
        "lista_numerada",
        "Construção, algoritmos, padrões, fundamentos e legado.",
        "Fonte em espanhol, com dez itens numerados e sem links de afiliado.",
        books(
            "Code Complete", "Introduction to Algorithms", "Design Patterns",
            "The Mythical Man-Month", "Structure and Interpretation of Computer Programs",
            "Clean Code", "Code Simplicity", "Working Effectively with Legacy Code",
            "The Pragmatic Programmer", "The Art of Computer Programming",
        ),
        NEW_ACCESS_DATE,
        "es",
    ),
    Source(
        "shellrent",
        "I libri da leggere se ami programmare",
        "Shellrent",
        "https://www.shellrent.com/blog/i-libri-da-leggere-se-ami-programmare/",
        "2022-04-22",
        "curadoria_empresa",
        "ordem_editorial",
        "Código limpo, padrões, ofício, decisão algorítmica e gestão de projetos.",
        "Fonte em italiano, com cinco indicações em ordem editorial.",
        books(
            "Clean Code", "Design Patterns", "The Pragmatic Programmer",
            "Algorithms to Live By", "The Mythical Man-Month",
        ),
        NEW_ACCESS_DATE,
        "it",
    ),
    Source(
        "modestprogrammer",
        "5 Książek, Które Powinien Przeczytać Każdy Programista",
        "Modest Programmer",
        "https://modestprogrammer.pl/5-ksiazek-ktore-powinien-przeczytac-kazdy-programista",
        "2022-06-17",
        "curadoria_individual",
        "ordem_editorial",
        "Código limpo, profissionalismo, arquitetura, ofício e legado.",
        "Fonte em polonês; a seção final de livros de programação para crianças não foi contada. Edições polonesas foram mapeadas para o título canônico e o título publicado apenas em polonês foi mantido no original.",
        books(
            "Clean Code", "The Clean Coder", "Clean Architecture", "Coders at Work",
            "The Pragmatic Programmer", "The Complete Software Developer's Career Guide",
            "Getting Things Programmed", "Design Patterns", "Refactoring",
            "The Software Craftsman", "Working Effectively with Legacy Code", "Code Complete",
        ),
        NEW_ACCESS_DATE,
        "pl",
    ),
    Source(
        "tabnews_d3vlopes",
        "Top 15 livros de programação",
        "TabNews / D3vlopes",
        "https://www.tabnews.com.br/D3vlopes/top-15-livros-de-programacao",
        "",
        "curadoria_individual",
        "ranking_explicito",
        "Ofício, código limpo, padrões, arquitetura, legado e algoritmos.",
        "Fonte em português. A página exibe a contagem do 15º ao 1º lugar; o CSV a reorganiza do 1º ao 15º.",
        books(
            "The Clean Coder", "The Art of Computer Programming", "Clean Code", "Refactoring",
            "Head First Design Patterns", "Test-Driven Development: By Example",
            "Clean Architecture", "Design Patterns", "Domain-Driven Design",
            "The Pragmatic Programmer", "The Mythical Man-Month",
            "Working Effectively with Legacy Code",
            "Patterns of Enterprise Application Architecture", "Clean Agile",
            "Grokking Algorithms",
        ),
        NEW_ACCESS_DATE,
        "pt",
    ),
    Source(
        "danieldcs",
        "16 livros para desenvolvedores em 2022",
        "Daniel Castro",
        "https://danieldcs.com/16-livros-para-desenvolvedores-ler-em-2022/",
        "2022-01-27",
        "curadoria_individual",
        "lista_numerada",
        "Padrões, produtividade, ágil, testes, domínio, arquitetura e microsserviços.",
        "Fonte em português, com dezesseis itens numerados; livros publicados somente em português mantêm o título original como canônico.",
        books(
            "Design Patterns", "14 Hábitos de Desenvolvedores Altamente Produtivos",
            "Estruturas de Dados e Algoritmos com JavaScript",
            "Orientação a Objetos e SOLID para Ninjas", "Grokking Algorithms",
            "Extreme Programming Explained", "Clean Code",
            "Microsserviços prontos para a produção", "Building Micro-Frontends",
            "Test-Driven Development: Teste e Design no Mundo Real", "Refactoring",
            "Domain-Driven Design", "Esteja, viva, permaneça 100% Presente",
            "The Pragmatic Programmer", "Arquitetura Limpa na Prática",
            "Monolith to Microservices",
        ),
        NEW_ACCESS_DATE,
        "pt",
    ),
    Source(
        "clean_code_developer",
        "Clean Code Developer — Literatur",
        "Clean Code Developer Initiative",
        "https://clean-code-developer.de/mehr-infos/literatur/",
        "",
        "curadoria_especialista",
        "ordem_editorial",
        "Código limpo, profissionalismo, arquitetura, padrões, refatoração e legado.",
        "Fonte em alemão. A página lista a edição original e a tradução alemã do mesmo livro em entradas separadas; cada título foi contado uma única vez. Inclui um livro de um dos mantenedores da iniciativa.",
        books(
            "Clean Code", "The Clean Coder", "Clean Architecture", "The Pragmatic Programmer",
            "Head First Design Patterns", "Refactoring", "Code Complete",
            "Working Effectively with Legacy Code", "Java by Comparison",
            "The Art of Readable Code", "Mit Flow Design zu Clean Code",
        ),
        NEW_ACCESS_DATE,
        "de",
    ),
    Source(
        "kent_comp5480",
        "COMP5480 Software Engineering Process — Indicative Reading",
        "University of Kent",
        "https://www.kent.ac.uk/courses/modules/module/COMP5480",
        "",
        "curadoria_academica",
        "ordem_editorial",
        "Livros-texto de processo e prática de engenharia de software.",
        "Bibliografia indicativa do módulo; a ordem publicada foi preservada.",
        books(
            "Software Engineering", "Software Engineering: A Practitioner's Approach",
            "Software Engineering: Theory and Practice",
            "Software Engineering: Principles and Practice",
        ),
        NEW_ACCESS_DATE,
    ),
    Source(
        "mtdvio",
        "Every Programmer Should Know",
        "mtdvio / GitHub",
        "https://github.com/mtdvio/every-programmer-should-know",
        "",
        "curadoria_open_source",
        "ordem_editorial",
        "Algoritmos, distribuídos, segurança, usabilidade, práticas e confiabilidade.",
        "Repositório versionado. Foram contados apenas os itens marcados como livro, na ordem do arquivo, limitados aos 20 primeiros; artigos e vídeos ficaram de fora.",
        books(
            "Computer Science Distilled", "Grokking Algorithms", "Introduction to Algorithms",
            "How to Count", "Understanding Distributed Systems",
            "Designing Data-Intensive Applications", "Secure Programming HOWTO",
            "Foundations of Security", "Don't Make Me Think",
            "Practical Object-Oriented Design in Ruby", "Working Effectively with Legacy Code",
            "The Art of Readable Code", "Code Complete", "Clean Code",
            "Test-Driven Development: By Example", "Release It!",
            "Mostly Adequate Guide to Functional Programming",
            "Structure and Interpretation of Computer Programs", "Site Reliability Engineering",
            "The Passionate Programmer",
        ),
        NEW_ACCESS_DATE,
    ),
    Source(
        "daninouai_classics",
        "Classic Software Engineering Resources",
        "daninouai / GitHub",
        "https://github.com/daninouai/classic-software-engineering-resources",
        "",
        "curadoria_open_source",
        "ordem_editorial",
        "Clássicos anteriores a 2010: construção, modelagem, arquitetura, testes e processo.",
        "Repositório versionado que reúne material clássico de engenharia de software; a ordem das seções foi preservada e a lista foi limitada aos 20 primeiros livros.",
        books(
            "Code Complete", "The Unified Modeling Language User Guide",
            "The Pragmatic Programmer", "Clean Code", "The Clean Coder",
            "A Philosophy of Software Design", "Working Effectively with Legacy Code",
            "Software Engineering: A Practitioner's Approach", "The Computer and the Brain",
            "Design Patterns", "Software Architecture in Practice",
            "Head First Design Patterns", "Refactoring",
            "Object-Oriented Analysis and Design with Applications",
            "Patterns of Enterprise Application Architecture", "Domain-Driven Design",
            "Modern Structured Analysis", "Designing the User Interface",
            "Testing Computer Software", "xUnit Test Patterns",
        ),
        NEW_ACCESS_DATE,
    ),
    Source(
        "habr",
        "10 Books Every Developer Should Read in 2025 to Level Up",
        "Habr",
        "https://habr.com/en/articles/871432/",
        "2025-01-27",
        "curadoria_individual",
        "lista_numerada",
        "Código limpo, depuração, foco, refatoração, system design e domínio.",
        "Publicação da comunidade Habr, em sua versão em inglês; os dez lugares numerados foram preservados.",
        books(
            "Clean Code", "The Pragmatic Programmer", "Code Complete", "Why Programs Fail",
            "Deep Work", "Refactoring", "System Design Interview", "Don't Make Me Think",
            "Design Patterns", "Domain-Driven Design",
        ),
        NEW_ACCESS_DATE,
    ),
]


# Livros presentes apenas em fontes específicas e que não têm uma chave comum acima.
AUTHORS.update(
    {
        "C++ and Patterns": "James O. Coplien",
        "Head First book series": "Kathy Sierra; Bert Bates",
        "Implementing Domain-Driven Design": "Vaughn Vernon",
        "The Lean Startup": "Eric Ries",
        "14 Habits of Highly Productive Developers": "Zeno Rocha",
        "Agile Project Management with Kanban": "Eric Brechner",
        "An Introduction to Formal Specification and Z": "Ben Potter; Jane Sinclair; David Till",
        "Applying UML and Patterns": "Craig Larman",
        "Att studera på högskolan": "Marina Bergman",
        "Better Embedded System Software": "Philip Koopman",
        "Bringing Design to Software": "Terry Winograd (editor)",
        "C# in Depth": "Jon Skeet",
        "CSS in Depth": "Keith J. Grant",
        "Computer Networking: A Top-Down Approach": "James F. Kurose; Keith W. Ross",
        "Computer Science: An Overview": "J. Glenn Brookshear; Dennis Brylow",
        "Computer Systems: A Programmer's Perspective": "Randal E. Bryant; David R. O'Hallaron",
        "Conceptual Blockbusting": "James L. Adams",
        "Crafting Interpreters": "Robert Nystrom",
        "Design Paradigms": "Henry Petroski",
        "Designing Secure Software": "Loren Kohnfelder",
        "Distributed Systems: Principles and Paradigms": "Andrew S. Tanenbaum; Maarten van Steen",
        "Effective Python": "Brett Slatkin",
        "Exploring Requirements": "Donald C. Gause; Gerald M. Weinberg",
        "Framework Design Guidelines": "Krzysztof Cwalina; Brad Abrams",
        "Grokking Simplicity": "Eric Normand",
        "Handbook of Software Quality Assurance": "Gordon G. Schulmeyer; James I. McManus",
        "Handbook of Walkthroughs, Inspections, and Technical Reviews": "Daniel P. Freedman; Gerald M. Weinberg",
        "Implementing Lean Software Development": "Mary Poppendieck; Tom Poppendieck",
        "Inclusive Design Patterns": "Heydon Pickering",
        "JavaScript and jQuery: Interactive Front-End Web Development": "Jon Duckett",
        "Letters to a New Developer": "Dan Moore",
        "Logic in Computer Science": "Michael Huth; Mark Ryan",
        "Manager's Handbook for Software Development": "NASA Goddard Space Flight Center",
        "Managing the Design Factory": "Donald G. Reinertsen",
        "Mastering the Requirements Process": "Suzanne Robertson; James Robertson",
        "Mathematics for Computer Science": "Eric Lehman; F. Thomson Leighton; Albert R. Meyer",
        "More Effective Agile": "Steve McConnell",
        "Object-Oriented Analysis and Design with Applications": "Grady Booch",
        "Object-Oriented Design Heuristics": "Arthur J. Riel",
        "Object-Oriented Software Engineering Using UML, Patterns, and Java": "Bernd Bruegge; Allen H. Dutoit",
        "Operating Systems: Three Easy Pieces": "Remzi H. Arpaci-Dusseau; Andrea C. Arpaci-Dusseau",
        "Pattern-Oriented Software Architecture": "Frank Buschmann; Regine Meunier; Hans Rohnert; Peter Sommerlad; Michael Stal",
        "Pragmatic Unit Testing in C# with NUnit": "Andy Hunt; Dave Thomas; Matt Hargett",
        "Prefactoring": "Ken Pugh",
        "Pro Git": "Scott Chacon; Ben Straub",
        "Program Development in Java": "Barbara Liskov; John Guttag",
        "Programming from First Principles": "Richard Bornat",
        "Python Object-Oriented Programming": "Steven F. Lott; Dusty Phillips",
        "Python Programming for the Absolute Beginner": "Michael Dawson",
        "Python Programming: An Introduction to Computer Science": "John M. Zelle",
        "RESTful Web APIs": "Leonard Richardson; Mike Amundsen; Sam Ruby",
        "Readings in Database Systems": "Peter Bailis; Joseph M. Hellerstein; Michael Stonebraker (editors)",
        "Refactoring Workbook": "William C. Wake",
        "Requirements Engineering and Rapid Development": "Ian Graham",
        "Requirements-led Project Management": "Suzanne Robertson; James Robertson",
        "Scenarios, Stories, Use Cases": "Ian F. Alexander; Neil Maiden",
        "Seven Languages in Seven Weeks": "Bruce A. Tate",
        "Small, Sharp Software Tools": "Brian P. Hogan",
        "Software Architecture: Perspectives on an Emerging Discipline": "Mary Shaw; David Garlan",
        "Software Configuration Management Patterns": "Stephen P. Berczuk; Brad Appleton",
        "Software Creativity 2.0": "Robert L. Glass",
        "Software Design": "David Budgen",
        "Software Development Pearls": "Karl E. Wiegers",
        "Software Engineering": "Ian Sommerville",
        "Software Engineering with Abstractions": "Valdis Berzins; Luqi",
        "Software Engineering: Principles and Practice": "Hans van Vliet",
        "Software Engineering: Theory and Practice": "Shari Lawrence Pfleeger; Joanne M. Atlee",
        "Software Product Assurance": "William L. Bryan; Stanley G. Siegel",
        "Software Requirements": "Karl E. Wiegers",
        "Software Requirements and Specifications": "Michael Jackson",
        "Software Requirements: Analysis and Specification": "Alan M. Davis",
        "Software Testing Techniques": "Boris Beizer",
        "Test-Driven Development: By Example": "Kent Beck",
        "Testing Computer Software": "Cem Kaner; Jack Falk; Hung Quoc Nguyen",
        "The Algorithm Design Manual": "Steven S. Skiena",
        "The Art of Agile Development": "James Shore; Shane Warden",
        "The Art of Software Testing": "Glenford J. Myers; Corey Sandler; Tom Badgett",
        "The Art of Systems Architecting": "Eberhardt Rechtin; Mark W. Maier",
        "The Art of Unix Programming": "Eric S. Raymond",
        "The Complete Guide to Software Testing": "William C. Hetzel",
        "The Design of Sites": "Douglas K. van Duyne; James A. Landay; Jason I. Hong",
        "The Manga Guide to Databases": "Mana Takahashi; Shoko Azuma",
        "The Nature of Software Development": "Ron Jeffries",
        "The Object-Oriented Thought Process": "Matt Weisfeld",
        "The Psychology of Computer Programming": "Gerald M. Weinberg",
        "The Tech Resume Inside Out": "Gergely Orosz",
        "The Tender Ship": "Arthur M. Squires",
        "The Unified Modeling Language User Guide": "Grady Booch; James Rumbaugh; Ivar Jacobson",
        "The Web Application Hacker's Handbook": "Dafydd Stuttard; Marcus Pinto",
        "Things They Don't Teach You in Software School": "Shane Neubauer",
        "UML Distilled": "Martin Fowler",
        "UML Toolkit": "Hans-Erik Eriksson; Magnus Penker",
        "Using UML: Software Engineering with Objects and Components": "Rob Pooley; Perdita Stevens",
        "Version Control with Git": "Jon Loeliger; Matthew McCullough",
        "Writing Effective Use Cases": "Alistair Cockburn",
        "xUnit Test Patterns": "Gerard Meszaros",
    }
)


# Livros que entraram com as fontes acrescentadas em 2026-07-26.
AUTHORS.update(
    {
        "A Book on C": "Al Kelley; Ira Pohl",
        "About Face": "Alan Cooper; Robert Reimann; David Cronin",
        "Algoritmos e Lógica da Programação": "Marco A. Furlan de Souza",
        "Algoritmos: Lógica para Desenvolvimento de Programação de Computadores": "José Augusto N. G. Manzano; Jayr Figueiredo de Oliveira",
        "Aprenda Programação Orientada a Objetos em 21 Dias": "Anthony Sintes",
        "Beautiful Evidence": "Edward R. Tufte",
        "Becoming a Better Programmer": "Pete Goodliffe",
        "But How Do It Know?": "J. Clark Scott",
        "Designing Web Usability": "Jakob Nielsen",
        "Envisioning Information": "Edward R. Tufte",
        "Explore It!": "Elisabeth Hendrickson",
        "Introduction to Software Testing": "Paul Ammann; Jeff Offutt",
        "Joel on Software": "Joel Spolsky",
        "Kubernetes in Action": "Marko Lukša",
        "Object-Oriented and Classical Software Engineering": "Stephen R. Schach",
        "Programming Interviews Exposed": "John Mongan; Noah Suojanen Kindler; Eric Giguère",
        "Project-Based Software Engineering": "Evelyn Stiller; Cathie LeBlanc",
        "Regular Expressions Cookbook": "Jan Goyvaerts; Steven Levithan",
        "Rocket Surgery Made Easy": "Steve Krug",
        "Seven Databases in Seven Weeks": "Luc Perkins; Eric Redmond; Jim R. Wilson",
        "Staff Engineer": "Will Larson",
        "The Agile Samurai": "Jonathan Rasmusson",
        "The Cathedral and the Bazaar": "Eric S. Raymond",
        "The Design of Everyday Things": "Don Norman",
        "The Inmates Are Running the Asylum": "Alan Cooper",
        "The Manager's Path": "Camille Fournier",
        "The Missing README": "Chris Riccomini; Dmitriy Ryaboy",
        "The Visual Display of Quantitative Information": "Edward R. Tufte",
        "Think Like a Programmer": "V. Anton Spraul",
        "Visual Explanations": "Edward R. Tufte",
    }
)


# Livros que entraram com a segunda rodada de fontes de 2026-07-26.
AUTHORS.update(
    {
        "A Common-Sense Guide to Data Structures and Algorithms": "Jay Wengrow",
        "Algorithms to Live By": "Brian Christian; Tom Griffiths",
        "An Embedded Software Primer": "David E. Simon",
        "Analysis Patterns": "Martin Fowler",
        "Androids": "Chet Haase",
        "Aprende SQL en un fin de semana": "Antonio Padial Solier",
        "Artificial Intelligence: A Guide to Intelligent Systems": "Michael Negnevitsky",
        "Building a Career in Software": "Daniel Heller",
        "Cloud Native DevOps with Kubernetes": "John Arundel; Justin Domingus",
        "Communication for Engineers": "Chris Laffra",
        "Computer Networks": "Andrew S. Tanenbaum; David J. Wetherall",
        "Deep Learning": "Ian Goodfellow; Yoshua Bengio; Aaron Courville",
        "Deep Work": "Cal Newport",
        "Design Patterns Explained": "Alan Shalloway; James R. Trott",
        "Design Rules: The Power of Modularity": "Carliss Y. Baldwin; Kim B. Clark",
        "Designing Distributed Systems": "Brendan Burns",
        "Designing Machine Learning Systems": "Chip Huyen",
        "Designing the User Interface": "Ben Shneiderman; Catherine Plaisant",
        "Dive into Design Patterns": "Alexander Shvets",
        "Docker in Action": "Jeff Nickoloff; Stephen Kuenzli",
        "Docs Like Code": "Anne Gentle",
        "Doing Hard Time": "Bruce Powell Douglass",
        "Effective DevOps": "Jennifer Davis; Katherine Daniels",
        "Effective Software Testing": "Maurício Aniche",
        "El gran libro de HTML5, CSS3 y JavaScript": "Juan Diego Gauchat",
        "El libro negro del Programador": "Rafael Gómez Blanes",
        "Fundamentals of Data Engineering": "Joe Reis; Matt Housley",
        "Fundamentals of Database Systems": "Ramez Elmasri; Shamkant B. Navathe",
        "Game Programming Patterns": "Robert Nystrom",
        "Git & GitHub desde cero": "Brais Moure",
        "Growing as a Mobile Engineer": "Gergely Orosz",
        "High Output Management": "Andrew S. Grove",
        "High Tech Start Up": "John L. Nesheim",
        "Java in a Nutshell": "Benjamin J. Evans; David Flanagan",
        "Learning Domain-Driven Design": "Vlad Khononov",
        "Learning SQL": "Alan Beaulieu",
        "Lean Enterprise": "Jez Humble; Joanne Molesky; Barry O'Reilly",
        "Machine Learning": "Ethem Alpaydin",
        "Machine Learning: The Art and Science of Algorithms that Make Sense of Data": "Peter Flach",
        "Modern Operating Systems": "Andrew S. Tanenbaum; Herbert Bos",
        "Monolith to Microservices": "Sam Newman",
        "More Programming Pearls": "Jon Bentley",
        "Object Solutions": "Grady Booch",
        "Operating Systems: Design and Implementation": "Andrew S. Tanenbaum; Albert S. Woodhull",
        "Practical Object-Oriented Design in Ruby": "Sandi Metz",
        "Principles of Software Engineering Management": "Tom Gilb",
        "Problem Frames and Methods": "Michael Jackson",
        "Professional Software Development": "Steve McConnell",
        "Programming in Scala": "Martin Odersky; Lex Spoon; Bill Venners",
        "Scaling Teams": "Alexander Grosse; David Loftesness",
        "Software Architecture Patterns": "Mark Richards",
        "Software Cost Estimation with COCOMO II": "Barry W. Boehm",
        "Software Engineering Economics": "Barry W. Boehm",
        "Software Fundamentals: Collected Papers": "David L. Parnas",
        "Software Product-Line Engineering": "David M. Weiss; Chi Tau Robert Lai",
        "Streaming Systems": "Tyler Akidau; Slava Chernyak; Reuven Lax",
        "Structured Computer Organization": "Andrew S. Tanenbaum; Todd Austin",
        "Technically Wrong": "Sara Wachter-Boettcher",
        "The Art of Doing Science and Engineering": "Richard W. Hamming",
        "The C++ Programming Language": "Bjarne Stroustrup",
        "The Coming Wave": "Mustafa Suleyman",
        "The Elements of Style": "William Strunk Jr.; E. B. White",
        "The Passionate Programmer": "Chad Fowler",
        "The Staff Engineer's Path": "Tanya Reilly",
        "The Tangled Web": "Michal Zalewski",
        "Thinking in Systems": "Donella H. Meadows",
    }
)


# Títulos trazidos pelas fontes que entraram na revisão de escopo.
AUTHORS.update(
    {
        "14 Hábitos de Desenvolvedores Altamente Produtivos": "Zeno Rocha",
        "Arquitetura Limpa na Prática": "Otávio Lemos",
        "Building Micro-Frontends": "Luca Mezzalira",
        "Computer Science Distilled": "Wladston Ferreira Filho",
        "Esteja, viva, permaneça 100% Presente": "Joel Moraes",
        "Estruturas de Dados e Algoritmos com JavaScript": "Loiane Groner",
        "Foundations of Security": "Neil Daswani; Christoph Kern; Anita Kesavan",
        "Getting Things Programmed": "Michał Bartyzel",
        "How to Count": "Steven Frank",
        "Java by Comparison": "Simon Harrer; Jörg Lenhard; Linus Dietz",
        "Microsserviços prontos para a produção": "Susan J. Fowler",
        "Mit Flow Design zu Clean Code": "Stefan Lieser",
        "Modern Structured Analysis": "Edward Yourdon",
        "Mostly Adequate Guide to Functional Programming": "Brian Lonsdorf",
        "Orientação a Objetos e SOLID para Ninjas": "Maurício Aniche",
        "Secure Programming HOWTO": "David A. Wheeler",
        "Software Architecture in Practice": "Len Bass; Paul Clements; Rick Kazman",
        "Test-Driven Development: Teste e Design no Mundo Real": "Maurício Aniche",
        "The Art of Readable Code": "Dustin Boswell; Trevor Foucher",
        "The Computer and the Brain": "John von Neumann",
        "Why Programs Fail": "Andreas Zeller",
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

    # Um título em AUTHORS sem nenhuma fonte indica renomeação ou erro de digitação.
    cited = {title for source in SOURCES for title in source.book_titles}
    orphans = sorted(set(AUTHORS) - cited)
    if orphans:
        raise ValueError(f"Títulos em AUTHORS sem fonte que os cite: {orphans}")


# Grade de qualidade da seção 4 do PROTOCOLO-FONTES.md.
#
# A pontuação é derivada por regra a partir dos campos já registrados de cada fonte, para que
# outra pessoa chegue ao mesmo número sem depender de julgamento. Onde a evidência anotada em
# `notes` contradiz a regra geral, a fonte aparece em QUALITY_OVERRIDES com o motivo.
QUALITY_CRITERIA = {
    "q1": "Autoridade de quem produziu",
    "q2": "Método declarado",
    "q3": "Objetividade",
    "q4": "Datação",
    "q5": "Controle editorial do veículo",
    "q6": "Posição frente a outras fontes",
    "q7": "Autopromoção",
}

_AUTORIDADE_ALTA = {
    "curadoria_especialista",
    "curadoria_especialistas",
    "curadoria_academica",
    "curadoria_curricular",
    "ranking_recomendacoes_especialistas",
    "ranking_dados_e_especialistas",
}
_REVISAO_INSTITUCIONAL = {"curadoria_academica", "curadoria_curricular"}
_VEICULO_COM_LINHA_EDITORIAL = {
    "curadoria_editorial",
    "curadoria_empresa",
    "curadoria_comercial",
    "curadoria_equipe",
}

# fonte_id -> {criterio: (nota, motivo)}
QUALITY_OVERRIDES: dict[str, dict[str, tuple[int, str]]] = {
    "exponent": {"q3": (2, "A página declara não usar links de afiliados nesta seleção.")},
    "profile_es": {"q3": (2, "Página sem links de afiliado.")},
    "serverless": {"q3": (2, "A página declara não ter associação com autores ou plataformas.")},
    "guru99": {"q3": (0, "Links comerciais e de afiliado na própria lista.")},
    "hackr": {"q3": (0, "Links de afiliado na própria lista.")},
    "upgrad": {"q3": (0, "O artigo promove cursos da empresa que publica a lista.")},
    "mentorcruise": {"q4": (2, "A página declara atualização anual.")},
    "sizovs": {"q4": (2, "Lista mantida e atualizada pelo autor.")},
    "dinahosting": {"q4": (2, "Traz seção de atualização de 2025.")},
    "dailydev": {"q4": (2, "Publicado em 2024 com nota editorial para 2026.")},
    "milan_2026": {"q7": (1, "Inclui um livro do próprio autor, identificado na fonte.")},
    "rockstar": {"q7": (1, "Recomenda dois livros do próprio autor, relação documentada.")},
    "clean_code_developer": {"q7": (1, "Inclui livro de um dos mantenedores da iniciativa.")},
    "shapingsoftware": {"q2": (1, "Declara que a numeração não é ordem comparativa.")},
    "roscoe_bartlett": {"q2": (1, "Declara que a seção está em ordem de importância relativa.")},
}


def quality_grade(source: Source) -> dict[str, object]:
    scores = {
        # Q1: veículo e autor identificados valem 1; trajetória verificável na área vale 2.
        "q1": 2 if source.nature in _AUTORIDADE_ALTA else 1,
        # Q2: só pontua quem explica como a lista foi montada.
        "q2": 2
        if source.order_type == "meta_ranking" or source.nature.startswith("ranking_")
        else (1 if source.nature in _REVISAO_INSTITUCIONAL else 0),
        # Q3: interesse comercial direto na indicação derruba a nota.
        "q3": 0 if source.nature == "curadoria_comercial" else (
            1 if source.nature in {"curadoria_empresa", "curadoria_editorial"} else 2
        ),
        # Q4: sem data não pontua; atualização declarada vira 2 via override.
        "q4": 1 if source.publication_date else 0,
        "q5": 2
        if source.nature in _REVISAO_INSTITUCIONAL
        else (1 if source.nature in _VEICULO_COM_LINHA_EDITORIAL else 0),
        # Q6: agregar e ordenar outras listas é a forma mais forte de se posicionar.
        "q6": 2
        if source.order_type == "meta_ranking"
        else (1 if source.nature.startswith("ranking_") else 0),
        "q7": 2,
    }
    reasons: dict[str, str] = {}
    for criterion, (score, reason) in QUALITY_OVERRIDES.get(source.source_id, {}).items():
        scores[criterion] = score
        reasons[criterion] = reason

    total = sum(scores.values())
    if total <= 4:
        tier = "frágil"
    elif total <= 9:
        tier = "aceitável"
    else:
        tier = "sólida"
    return {**scores, "total": total, "faixa": tier, "motivos": reasons}


# Identidade autoral por trás da URL, para o portão G6. Só precisa constar aqui quem publica
# em mais de um lugar: sem entrada, a fonte é tratada como voz única.
# Cursos distintos da mesma universidade não entram, porque têm ementa e responsável próprios.
AUTHOR_IDENTITIES = {
    "devto_javinpaul": "javinpaul",
    "medium_javinpaul": "javinpaul",
    "pragmatic_engineer_reading": "gergely-orosz",
    "pragmatic_engineer_holiday": "gergely-orosz",
}


def audit_gates() -> list[str]:
    """Reaplica os portões mecânicos do protocolo sobre a base montada.

    Devolve as violações encontradas. Serve para impedir que a base se afaste do protocolo
    sem que isso apareça em algum lugar.
    """
    findings: list[str] = []
    by_id = {source.source_id: source for source in SOURCES}

    for source in SOURCES:
        if len(source.book_titles) < MIN_BOOKS_PER_SOURCE:
            findings.append(
                f"G4 · {source.source_id}: {len(source.book_titles)} livros, "
                f"mínimo é {MIN_BOOKS_PER_SOURCE}."
            )

    # G5 só é conclusivo entre listas de tamanho comparável; abaixo disso a sobreposição alta
    # é artefato de uma lista curta caber dentro de uma longa.
    ids = sorted(by_id)
    for i, first_id in enumerate(ids):
        for second_id in ids[i + 1 :]:
            first, second = by_id[first_id], by_id[second_id]
            if min(len(first.book_titles), len(second.book_titles)) < G5_MIN_LIST:
                continue
            shared = set(first.book_titles) & set(second.book_titles)
            fraction = len(shared) / min(len(first.book_titles), len(second.book_titles))
            if fraction < G5_OVERLAP:
                continue
            same_order = [t for t in first.book_titles if t in shared] == [
                t for t in second.book_titles if t in shared
            ]
            if same_order:
                findings.append(
                    f"G5 · {first_id} x {second_id}: {len(shared)} títulos "
                    f"({fraction:.0%} da menor lista) na mesma ordem."
                )

    # G6 é sobre o autor, não sobre o domínio: dev.to, Medium e GitHub hospedam autores
    # distintos, e duas páginas ali não são a mesma voz. Por isso a checagem usa identidades
    # declaradas em AUTHOR_IDENTITIES em vez de comparar o host.
    seen_author: dict[str, str] = {}
    for source in SOURCES:
        identity = AUTHOR_IDENTITIES.get(source.source_id)
        if not identity:
            continue
        if identity in seen_author:
            findings.append(
                f"G6 · {source.source_id} e {seen_author[identity]} são do mesmo autor "
                f"({identity})."
            )
        else:
            seen_author[identity] = source.source_id

    return findings


def write_source_files() -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    mention_rows: list[dict[str, object]] = []
    source_index: list[dict[str, object]] = []

    for source in SOURCES:
        total = len(source.book_titles)
        access_date = source.access_date or ACCESS_DATE
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

        grade = quality_grade(source)
        grade_rows = "\n".join(
            f"| {key.upper()} | {label} | {grade[key]} |"
            + (f" {grade['motivos'][key]}" if key in grade["motivos"] else "")
            for key, label in QUALITY_CRITERIA.items()
        )
        grade_block = f"""
## Grade de qualidade

Critérios da seção 4 do [protocolo](../../PROTOCOLO-FONTES.md), de 0 a 2 cada.

| # | Critério | Nota |
|---|---|---:|
{grade_rows}

**Total: {grade["total"]}/14 · faixa {grade["faixa"]}.**
"""

        info = f"""# {source.title}

- **Publicador/curador:** {source.publisher}
- **URL:** {source.url}
- **Domínio:** {urlparse(source.url).netloc}
- **Data de publicação/atualização identificada:** {source.publication_date or "não identificada"}
- **Data de acesso:** {access_date}
- **Acessibilidade na checagem final:** HTTP 200 em {access_date}
- **Natureza:** `{source.nature}`
- **Tipo de ordem:** `{source.order_type}`
- **Idioma:** `{source.language}`
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
{grade_block}"""
        (source_dir / "fonte.md").write_text(info, encoding="utf-8")

        source_index.append(
            {
                "fonte_id": source.source_id,
                "titulo": source.title,
                "publicador": source.publisher,
                "dominio": urlparse(source.url).netloc,
                "url": source.url,
                "data_publicacao_atualizacao": source.publication_date,
                "data_acesso": access_date,
                "status_http_na_coleta": 200,
                "natureza": source.nature,
                "tipo_ordem": source.order_type,
                "idioma": source.language,
                "quantidade_livros": total,
                "escopo": source.scope,
                "observacoes": source.notes,
                **{f"qualidade_{key}": grade[key] for key in QUALITY_CRITERIA},
                "qualidade_total": grade["total"],
                "qualidade_faixa": grade["faixa"],
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

    english_sources = sum(1 for source in SOURCES if source.language == "en")
    other_languages = sorted({source.language for source in SOURCES if source.language != "en"})
    # As fontes entraram em levas; a contagem por data de acesso é montada a partir dos dados.
    per_access_date = defaultdict(int)
    for source in SOURCES:
        per_access_date[source.access_date or ACCESS_DATE] += 1
    access_summary = ", ".join(
        f"{count} em {day}" for day, count in sorted(per_access_date.items())
    )
    last_access = max(per_access_date)
    readme = f"""# Melhores livros para desenvolvimento de software

Levantamento iniciado em **{ACCESS_DATE}** e atualizado em **{last_access}**, com
**{len(SOURCES)} fontes**, **{mentions} menções** e **{len(ranking)} títulos normalizados**.

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

## Coleta das fontes

As fontes vieram de busca na web em sete idiomas, variando as chaves em torno de
"melhores livros" e "livros que todo programador deveria ler", mais os links citados
pelos meta-rankings já existentes:

```
en  best programming books
    best books for software developers
    books every programmer should read
    top software engineering books
    software engineering reading list        (ementas de universidade)
    awesome programming books site:github.com
    most recommended programming books       (meta-rankings)
pt  melhores livros de programação
    livros que todo desenvolvedor deveria ler
es  mejores libros de programación
    libros para programadores
fr  meilleurs livres pour développeur
    livres à lire développeur
it  migliori libri di programmazione
    libri che ogni programmatore dovrebbe leggere
de  beste Programmierbücher
    Bücher für Softwareentwickler
pl  najlepsze książki dla programistów
```

## Seleção e tratamento

Os critérios completos estão em [`PROTOCOLO-FONTES.md`](PROTOCOLO-FONTES.md), que define os
portões eliminatórios, a grade de qualidade e as regras de extração. Resumo:

- Foram incluídas páginas que recomendam livros para programação ou engenharia de software
  de forma geral e cuja ordem é reproduzível.
- Uma revisão de escopo descartou 10 fontes: 8 que eram, na maior parte, listas de nicho ou
  de linguagem específica, e 2 cuja ordem não era reproduzível (ranking por votos recalculado
  continuamente e vitrine comercial dinâmica). Outras 10 fontes entraram no lugar.
- O corte usado nessa revisão foi de pelo menos **70% de livros de programação ou engenharia
  de software de escopo geral** por fonte, descontando manuais de linguagem, autoajuda,
  biografias e ficção.
- Listas editoriais muito longas foram limitadas aos **20 primeiros itens**. O meta-ranking
  explícito de Pierre de Wulf manteve seus 25 itens.
- Edições, subtítulos e abreviações foram consolidados sob um título canônico. Fontes em
  outros idiomas entram com o título canônico do original; livros publicados somente em um
  idioma local mantêm ali o título original como canônico.
- Um livro conta no máximo uma vez por fonte.
- A base contém {meta_sources} meta-rankings, {explicit_rankings} rankings explícitos,
  {numbered} listas numeradas e {editorial} listas em ordem editorial.
- CSVs usam vírgula como delimitador e UTF-8 com BOM para facilitar abertura no Excel.
- Todas as URLs responderam com HTTP 200 na data registrada em `data_acesso`:
  {access_summary}.

## Como interpretar

O resultado mede **consenso de recomendação na web**, não qualidade absoluta. Há vieses de
popularidade, idioma, listas com links de afiliados e sobreposição indireta entre
meta-rankings e algumas fontes primárias. {english_sources} das {len(SOURCES)} fontes estão em
inglês; as outras {len(SOURCES) - english_sources} se dividem entre {", ".join(other_languages)}.
As colunas `natureza` e `idioma` em `fontes.csv`, além de cada `fonte.md`, tornam esses casos
visíveis.

## Página web

A página responsiva em `index.html` apresenta o ranking, permite buscar e filtrar livros,
expande as fontes de cada resultado e reúne as {len(SOURCES)} fontes pesquisadas. Como os dados são
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
            "natureza", "tipo_ordem", "idioma",
            "quantidade_livros", "escopo", "observacoes",
            *(f"qualidade_{key}" for key in QUALITY_CRITERIA),
            "qualidade_total", "qualidade_faixa",
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

    tiers = defaultdict(int)
    for row in source_index:
        tiers[row["qualidade_faixa"]] += 1
    print(
        "Qualidade: "
        + ", ".join(f"{count} {tier}" for tier, count in sorted(tiers.items()))
    )

    findings = audit_gates()
    csv_write(
        ROOT / "auditoria.csv",
        ["portao", "detalhe"],
        [
            {"portao": finding.split(" · ", 1)[0], "detalhe": finding.split(" · ", 1)[1]}
            for finding in findings
        ],
    )
    if findings:
        print(f"\nAuditoria dos portões: {len(findings)} pendência(s) registrada(s)")
        for finding in findings:
            print(f"  {finding}")


if __name__ == "__main__":
    main()
