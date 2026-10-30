// Käsitteellinen virhe: etumerkitön tyyppi u64 ei voi esittää negatiivisia lukuja.
use std::io::{self, Read};

fn main() {
    let mut syote = String::new();
    io::stdin().read_to_string(&mut syote).unwrap();
    let mut total: u64 = 0;
    for rivi in syote.lines() {
        let n: u64 = rivi.trim().parse().unwrap();
        if n == 0 {
            break;
        }
        total += n;
    }
    println!("Summa: {}", total);
}
