// Nomes dos bichos: cientistas conhecidos, pelo sobrenome (é como são lembrados).
// Macho recebe nome de cientista homem, fêmea de cientista mulher. Nenhum sobrenome
// se repete entre as duas listas, e a lista é grande de propósito: só depois de a
// ilha gastar todos os nomes de um sexo é que um nome volta, com numeral ("Curie II").

const MALE = [
  // Física
  'Einstein', 'Newton', 'Galileu', 'Faraday', 'Maxwell', 'Bohr', 'Planck', 'Heisenberg',
  'Schrödinger', 'Feynman', 'Dirac', 'Pauli', 'Fermi', 'Hawking', 'Tesla', 'Kepler',
  'Copérnico', 'Huygens', 'Hooke', 'Boyle', 'Ampère', 'Volta', 'Ohm', 'Coulomb', 'Joule',
  'Kelvin', 'Carnot', 'Clausius', 'Boltzmann', 'Gibbs', 'Rutherford', 'Thomson', 'Chadwick',
  'Becquerel', 'Röntgen', 'Hertz', 'Marconi', 'Oppenheimer', 'Bethe', 'Gell-Mann', 'Higgs',
  'Weinberg', 'Salam', 'Yukawa', 'Raman', 'Bose', 'Chandrasekhar', 'Hubble', 'Lemaître',
  'Landau', 'Kapitsa', 'Gamow', 'Sakharov', 'Tsiolkovsky', 'Doppler', 'Fresnel', 'Foucault',
  'Michelson', 'Lorentz', 'Zeeman', 'Compton', 'de Broglie', 'Born', 'Millikan', 'Lattes',
  'Schenberg', 'Leite Lopes', 'Tycho', 'Halley', 'Herschel', 'Messier', 'Eddington',
  // Matemática
  'Euler', 'Gauss', 'Riemann', 'Arquimedes', 'Euclides', 'Pitágoras', 'Leibniz', 'Descartes',
  'Pascal', 'Fermat', 'Laplace', 'Lagrange', 'Fourier', 'Cantor', 'Hilbert', 'Gödel',
  'Poincaré', 'Cauchy', 'Galois', 'Abel', 'Jacobi', 'Dedekind', 'Kolmogorov', 'Lobachevsky',
  'Markov', 'Ramanujan', 'Al-Khwarizmi', 'Fibonacci', 'Napier', 'Bernoulli', 'Legendre',
  'Weierstrass', 'Klein', 'Nash', 'Erdős', 'Grothendieck', 'Perelman', 'Tao', 'Avila',
  // Química
  'Lavoisier', 'Mendeleev', 'Dalton', 'Avogadro', 'Pauling', 'Nobel', 'Bunsen', 'Kekulé',
  'Arrhenius', 'Haber', 'Liebig', 'Wöhler', 'Berzelius', 'Priestley', 'Cavendish', 'Davy',
  'Lewis', 'Sanger', 'Pasteur',
  // Biologia e medicina
  'Darwin', 'Mendel', 'Wallace', 'Lamarck', 'Lineu', 'Cuvier', 'Humboldt', 'Hipócrates',
  'Galeno', 'Vesalius', 'Harvey', 'Jenner', 'Lister', 'Koch', 'Fleming', 'Salk', 'Sabin',
  'Semmelweis', 'Snow', 'Pavlov', 'Mechnikov', 'Ramón y Cajal', 'Golgi', 'Sherrington',
  'Watson', 'Crick', 'Wilkins', 'Krebs', 'Monod', 'Jacob', 'Dawkins', 'Gould', 'Mayr',
  'Dobzhansky', 'Haldane', 'Fisher', 'Trivers', 'Lorenz', 'Tinbergen', 'von Frisch',
  'Leeuwenhoek', 'Malpighi', 'Schwann', 'Virchow', 'Morgan', 'Oswaldo Cruz', 'Chagas',
  'Vital Brazil', 'Adolpho Lutz', 'Pavan', 'Nicolelis', 'Freud', 'Piaget', 'Skinner',
  // Terra e céu
  'Lyell', 'Hutton', 'Wegener', 'Agassiz', 'Ab\'Sáber', 'Milton Santos', 'Sagan',
  // Computação
  'Turing', 'von Neumann', 'Shannon', 'Wiener', 'Babbage', 'Boole', 'Church', 'Knuth',
  'Dijkstra', 'McCarthy', 'Minsky', 'Berners-Lee', 'Cerf', 'Hoare', 'Ritchie', 'Thompson',
  // Antiguidade e mundo islâmico, chinês e indiano
  'Aristóteles', 'Eratóstenes', 'Ptolomeu', 'Demócrito', 'Tales', 'Avicena', 'Alhazen',
  'Al-Biruni', 'Khayyam', 'Zhang Heng', 'Shen Kuo', 'Aryabhata', 'Brahmagupta'
];

const FEMALE = [
  'Curie', 'Lovelace', 'Franklin', 'Meitner', 'Noether', 'Hipátia', 'Goodall', 'Carson',
  'McClintock', 'Hodgkin', 'Wu', 'Johnson', 'Hopper', 'Rubin', 'Leavitt', 'Payne',
  'Anning', 'Germain', 'Goeppert Mayer', 'Elion', 'Levi-Montalcini', 'Tu Youyou', 'Doudna',
  'Charpentier', 'Barré-Sinoussi', 'Margulis', 'Fossey', 'Jemison', 'Bell Burnell', 'Lamarr',
  'Nightingale', 'Blackwell', 'Joliot-Curie', 'Mirzakhani', 'Vaughan', 'Jackson',
  'Annie Cannon', 'Williamina Fleming', 'Stevens', 'Bertha Lutz', 'Nise da Silveira',
  'Döbereiner', 'Graziela Barroso', 'Tharp', 'Lehmann', 'Lonsdale', 'Yalow', 'Cori', 'Buck',
  'Moser', 'Greider', 'Blackburn', 'Yonath', 'Arnold', 'Strickland', 'Ghez', 'Karikó',
  'Lederberg', 'Somerville', 'du Châtelet', 'Bassi', 'Merian', 'Hildegarda', 'Kovalevskaya',
  'Blodgett', 'Kwolek', 'Clarke', 'Hamilton', 'Perlman', 'Allen', 'Liskov', 'Goldwasser',
  'Spärck Jones', 'Leakey', 'Alper', 'Cooke Wright', 'Wong-Staal', 'Mitchell',
  'Swallow Richards', 'Brooks', 'Perey', 'Noddack', 'Ammal', 'Chatterjee', 'Chawla',
  'Benerito', 'Sawyer Hogg', 'Seager', 'Tarter', 'McNutt', 'Grandin', 'Zatz',
  'Herculano-Houzel', 'Sonia Guimarães', 'Soares-Santos', 'Goes de Jesus', 'Sabino',
  'Caroline Herschel', 'Burbidge', 'Faber', 'Shoemaker', 'Gaillard', 'Porco', 'Conway',
  'Borg', 'Kistiakowsky', 'Rees'
];

// Garantia contra deslize ao crescer as listas: sobrenome que já é de um homem sai da
// lista feminina, para dois bichos de sexos diferentes nunca dividirem o nome.
const MALE_SET = new Set(MALE);

export const MALE_SCIENTISTS = Object.freeze(MALE);
export const FEMALE_SCIENTISTS = Object.freeze(FEMALE.filter(name => !MALE_SET.has(name)));
