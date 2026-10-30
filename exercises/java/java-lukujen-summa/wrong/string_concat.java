// Käsitteellinen virhe: luvut luetaan merkkijonoina ja liitetään yhteen.
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner lukija = new Scanner(System.in);
        String total = "";
        while (lukija.hasNext()) {
            String n = lukija.next();
            if (n.equals("0")) break;
            total += n;
        }
        System.out.println("Summa: " + total);
    }
}
