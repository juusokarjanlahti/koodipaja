use std::io::{self, Read};

fn main() {
    let mut syote = String::new();
    io::stdin().read_to_string(&mut syote).unwrap();
    // Suunnitelma:
    // 1. Aloita summasta 0
    // 2. Toista: lue seuraava luku
    // 3. Jos luku on 0, lopeta toistaminen
    // 4. Muuten lisää luku summaan
    // 5. Tulosta summa
}
