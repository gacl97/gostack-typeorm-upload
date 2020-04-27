import { getCustomRepository, getRepository } from 'typeorm';
// import AppError from '../errors/AppError';

import TransacitonsRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import AppError from '../errors/AppError';

interface RequestDTO {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: RequestDTO): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransacitonsRepository);
    const categoryRepository = getRepository(Category);

    if (type.toLowerCase() !== 'income' && type.toLowerCase() !== 'outcome') {
      throw new AppError('Invalid type', 400);
    }

    const balance = await transactionsRepository.getBalance();

    if (type.toLowerCase() === 'outcome' && value > balance.total) {
      throw new AppError("You can't spend more than you have.", 400);
    }

    let categoryExists = await categoryRepository.findOne({
      where: { title: category },
    });

    if (!categoryExists) {
      categoryExists = categoryRepository.create({
        title: category,
      });

      await categoryRepository.save(categoryExists);
    }

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category_id: categoryExists.id,
    });

    await transactionsRepository.save(transaction);

    delete transaction.category_id;

    return transaction;
  }
}

export default CreateTransactionService;
