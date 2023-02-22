package own.echoify;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.Reader;
import java.io.Writer;



        /******************************************************************
        *******************************************************************
        **                                                               **
        **   I M P O R T A N T :   R E A D   C O M M E N T   B E L O W   **
        **                                                               **
        *******************************************************************
        ******************************************************************/

// Change the String constant PROJECT_FOLDER to be the location of your MetriMask_mobile project folder.
// Then run Main to generate install_modules.sh and install_modules.bat from tools/install_modules_raw.sh.



public class Main
    {
    private static final String PROJECT_FOLDER = "/development/rn/MetriMask_mobile";

    private static final String INPUT_FILE      = PROJECT_FOLDER + File.separator + "tools" + File.separator + "install_modules_raw.sh";
    private static final String OUTPUT_FILE_SH  = PROJECT_FOLDER + File.separator + "install_modules.sh";
    private static final String OUTPUT_FILE_BAT = PROJECT_FOLDER + File.separator + "install_modules.bat";

    public static void main(String[] args)
        {
        echoify(INPUT_FILE, OUTPUT_FILE_SH, OUTPUT_FILE_BAT);
        }

    private static void echoify(String inFile, String outFileSh, String outFileBat)
        {
        try
            {
            echoifyEx(inFile, outFileSh, outFileBat);
            }
        catch (java.io.IOException e)
            {
            reportException(e);
            }
        }

    private static void echoifyEx(String inFile, String outFileSh, String outFileBat) throws java.io.IOException
        {
        System.out.println("ECHOIFY: " + inFile + " --> " + outFileSh + " & " + outFileBat);
        long lineCount = echoifyEx(new FileReader(inFile), new FileWriter(outFileSh), new FileWriter(outFileBat));
        System.out.println("ECHOIFY: " + lineCount + " input lines processed.");
        }

    private static long echoifyEx(Reader in, Writer outSh, Writer outBat) throws java.io.IOException
        {
        long lineCount = 0;
        BufferedReader bin = new BufferedReader(in);
        BufferedWriter boutSh = new BufferedWriter(outSh);
        BufferedWriter boutBat = new BufferedWriter(outBat);
        while (process1Line(bin, boutSh, boutBat)) lineCount++;
        bin.close();
        boutSh.close();
        boutBat.close();
        return lineCount;
        }

    private static boolean process1Line(BufferedReader bin, BufferedWriter boutSh, BufferedWriter boutBat) throws java.io.IOException
        {
        final String input = bin.readLine();
        if (input == null) return false;
        output1LineSh(input, boutSh);
        output1LineBat(input, boutBat);
        return true;
        }

    private static void output1LineBat(String input, BufferedWriter bout) throws java.io.IOException
        {
        quoteLine("@echo.", false, bout);
        quoteLine("@echo ################################################################################################", false, bout);
        quoteLine(input, false, bout);
        }

    private static void output1LineSh(String input, BufferedWriter bout) throws java.io.IOException
        {
        bout.write("echo \"\"");
        bout.newLine();
        bout.write("echo ");
        quoteLine("################################################################################################", true, bout);
        bout.write("echo ");
        quoteLine(input, true, bout);
        quoteLine(input, false, bout);
        }

    private static void quoteLine(String input, boolean doIt, BufferedWriter bout) throws java.io.IOException
        {
        bout.write(doIt ? "\"" + input.replace("\"", "\\\"") + "\"" : input);
        bout.newLine();
        }

    private static void reportException(Exception e)
        {
        System.err.println("Oh NO! Alas, an exception must be reported.");
        System.err.println("######################################################################################");
        System.err.println(e.toString());
        System.err.println("######################################################################################");
        }
    }
