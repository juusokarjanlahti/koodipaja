// Hyväksytään: kirjainkoko ja kaksoispiste poikkeavat, summa on oikein.
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner lukija = new Scanner(System.in);
        long total = 0;
        while (lukija.hasNextLong()) {
            long n = lukija.nextLong();
            if (n == 0) break;
            total += n;
        }
        System.out.println("summa " + total);
    }
}
