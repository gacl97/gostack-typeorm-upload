import csvParse from 'csv-parse';
import fs from 'fs';
import { getRepository, getCustomRepository } from 'typeorm';
import TransactionRepository from '../repositories/TransactionsRepository';

import Category from '../models/Category';
import Transaction from '../models/Transaction';

interface RequestDTO {
  filepath: string;
}

interface TransactionData {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute({ filepath }: RequestDTO): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionRepository);
    const categoriesRepository = getRepository(Category);

    const readCSVStream = fs.createReadStream(filepath);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    const lines: TransactionData[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line;
      lines.push({ title, type, value, category });
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    await fs.promises.unlink(filepath);

    const categories = await categoriesRepository.find();

    const categoriesTitleAlreadyInDB: string[] = categories.map(
      category => category.title,
    );

    const categoriesTitleInCSV: string[] = lines.map(
      category => category.category,
    );

    const differentCategories = categoriesTitleInCSV.filter(category => {
      return !categoriesTitleAlreadyInDB.includes(category);
    });

    const uniqueCategories = differentCategories.filter(
      (category, i) => differentCategories.indexOf(category) === i,
    );

    if (uniqueCategories.length > 0) {
      const newCategories = uniqueCategories.map(category =>
        categoriesRepository.create({ title: category }),
      );

      await categoriesRepository.save(newCategories);
    }

    const categoriesUpdated = await categoriesRepository.find();

    const transactions = lines.map(transaction => {
      const categoryIndex = categoriesUpdated.findIndex(
        category => category.title === transaction.category,
      );
      const category_id = categoriesUpdated[categoryIndex].id;
      return transactionsRepository.create({
        title: transaction.title,
        value: Number(transaction.value),
        type: transaction.type,
        category_id,
      });
    });

    await transactionsRepository.save(transactions);

    return transactions;
  }
}

export default ImportTransactionsService;
