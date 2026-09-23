// Bando: os membros de uma tribo ligados por amizade, com o centro deles.
export class Band {
  constructor(members) {
    this.members = members;
    let x = 0, y = 0;
    for (const member of members) { x += member.x; y += member.y; }
    this.x = x / members.length;
    this.y = y / members.length;
  }
}
