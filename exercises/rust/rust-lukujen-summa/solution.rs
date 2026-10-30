use std::io::{self, Read};

fn main() {
    let mut syote = String::new();
    io::stdin().read_to_string(&mut syote).unwrap();
    let mut total: i64 = 0;
    for rivi in syote.lines() {
        let n: i64 = rivi.trim().parse().unwrap();
        if n == 0 {
            break;
        }
        total += n;
    }
    println!("Summa: {}", total);
}
