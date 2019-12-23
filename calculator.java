package com.company;

import java.io.Console;
import java.util.Scanner;

public class calculator{

    public static void main(String[] args) {

        

        try {
            Scanner s = new Scanner(System.in);
            //int foo = Integer.parseInt(no1);
            //int foo2 = Integer.parseInt(no2);
            System.out.println("pls enter the type of calculation you would like to do");
            String foo3 = s.nextLine();
            System.out.println("Please enter the first number:");
            String string1 = s.nextLine();
                double foo = Double.parseDouble(string1);

            System.out.println("Please enter the second number:");
            String string2 = s.nextLine();
            double foo2 = Double.parseDouble(string2);

            double result;
            if ( foo3.equals("+")) {
                result = foo + foo2;
            }
            else if ( foo3.equals("-")) {
                result = foo - foo2;
            }
            else if ( foo3.equals("/")){
                result= foo / foo2;
            }
            else if (foo3.equals("*")) {
                result = foo * foo2;
            }
            else
            {
                System.out.printf("You idiot!!! You entered: " + foo3);
                return;
            }

            System.out.printf("%s " + foo3 + " %s = %s", string1, string2,result);
            System.out.println("\nwas the answer correct respond with yes or no");
            String a = s.nextLine();
            if (a.equals("yes")) {
                System.out.println("thank you for using callum's calculator");
            } else if (a.equals("no")) {
                System.out.println("you dumb idiot");
            }
        } catch (NumberFormatException nfe) {
            System.out.printf("Could not do the calculation. Please make sure you send through two numbers beacuse of.%s%n", nfe);
        
       
        }
    }
}

